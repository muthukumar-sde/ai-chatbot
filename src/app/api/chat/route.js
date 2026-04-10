import { NextRequest, NextResponse } from "next/server";
import { app as agent } from "@/lib/agent";
import { HumanMessage } from "@langchain/core/messages";
import { checkSemanticCache, addToSemanticCache, isContextDependent } from "@/lib/agent/cache";

export async function POST(req) {
  try {
    const { messages, userLocation, threadId } = await req.json();

    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const content = lastUserMsg?.content?.trim() || "";

    // ✅ Skip cache + LLM for empty input
    if (!content) {
      return NextResponse.json({ role: "assistant", content: "Send a message and I’ll help you instantly." });
    }
    // ✅ Check if user is asking about their location
    const locationKeywords = ["my location", "where am i", "current location", "my city", "detect location"];
    const isLocationQuery = locationKeywords.some(kw => content.toLowerCase().includes(kw));

    if (isLocationQuery && userLocation) {
      // Reverse geocode to get city name
      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lon}`,
          {
            headers: {
              'User-Agent': 'PropertyAssistant/1.0'
            }
          }
        );

        // Check if response is ok
        if (!geoResponse.ok) {
          throw new Error(`Geocoding API returned ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();
        const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Your location";

        const response = {
          role: "assistant",
          content: `📍 **${city}** — Your current location is in ${city}. How can I help you find properties here?`
        };

        return NextResponse.json(response);
      } catch (error) {
        console.warn("⚠️ Geocoding error:", error.message);
        // Fallback: just show coordinates without reverse geocoding
        const response = {
          role: "assistant",
          content: `📍 **Location Detected** — Your location: Lat ${userLocation.lat.toFixed(4)}, Lon ${userLocation.lon.toFixed(4)}. I can use this to find nearby properties for you.`
        };
        return NextResponse.json(response);
      }
    }
    // ✅ Level 2: Semantic cache
    if (!isContextDependent(content)) {
      const cached = await checkSemanticCache(content);
      if (cached) return NextResponse.json(cached);
    }

    // ✅ Append user location if available (for agent, not for cache)
    let contentForAgent = content;
    if (userLocation) {
      contentForAgent += `\n\n(User's current location: Lat ${userLocation.lat}, Lon ${userLocation.lon})`;
    }

    // ✅ Run agent with location-appended content
    const config = { configurable: { thread_id: threadId ?? "fallback-session" } };
    const result = await agent.invoke(
      { messages: [new HumanMessage(contentForAgent)] },
      config
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const response = { role: "assistant", content: lastMessage.content };

    // ✅ Store ORIGINAL content in cache (not location-appended)
    if (!isContextDependent(content)) {
      await addToSemanticCache(content, response);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}