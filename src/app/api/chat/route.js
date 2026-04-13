import { NextRequest, NextResponse } from "next/server";
import { app as agent } from "@/lib/agent";
import { reverseGeocode } from "@/lib/agent/geocode";
import { HumanMessage } from "@langchain/core/messages";
import { checkSemanticCache, addToSemanticCache, isContextDependent } from "@/lib/agent/cache";

export async function POST(req) {
  try {
    const { messages, userLocation, threadId } = await req.json();
    console.log("mklogs API received messages:", userLocation);
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const content = lastUserMsg?.content?.trim() || "";

    // ✅ Skip cache + LLM for empty input
    if (!content) {
      return NextResponse.json({ role: "assistant", content: "Send a message and I'll help you instantly." });
    }

    // ✅ Check if user is asking about their location
    const locationKeywords = ["my location", "where am i", "current location", "my city", "detect location"];
    const isLocationQuery = locationKeywords.some(kw => content.toLowerCase().includes(kw));

    if (isLocationQuery && userLocation) {
      // const city = await reverseGeocode(userLocation.lat, userLocation.lon);

      if (userLocation?.city) {
        return NextResponse.json({
          role: "assistant",
          content: `📍 **${userLocation?.city}** — Your current location is in ${city}. How can I help you find properties here?`
        });
      } else {
        return NextResponse.json({
          role: "assistant",
          content: `📍 **Location Detected** — Your location: Lat ${userLocation.lat.toFixed(4)}, Lon ${userLocation.lon.toFixed(4)}. I can use this to find nearby properties for you.`
        });
      }
    }

    // ✅ Semantic cache check
    // if (!isContextDependent(content)) {
    //   const cached = await checkSemanticCache(content);
    //   if (cached) return NextResponse.json(cached);
    // }

    // ✅ Only append coordinates for proximity queries
    const proximityKeywords = ["near me", "nearby", "closest", "nearest", "around me", "my location", "my area"];
    const isProximityQuery = proximityKeywords.some(kw => content.toLowerCase().includes(kw));

    let contentForAgent = content;
    if (userLocation) {
      const city = await reverseGeocode(userLocation.lat, userLocation.lon);
      // if (isProximityQuery) {
      contentForAgent += ` 
        USER CONTEXT:
        - currentUserLocation: ${userLocation.city || "Unknown"}
        - nearLat: ${userLocation.lat}
        - nearLon: ${userLocation.lon}

        INSTRUCTION:
        - If user says "near me", "nearby", or does not specify a location:
          → MUST set:
            nearLat = ${userLocation.lat}
            nearLon = ${userLocation.lon}
            nearPlace = "${userLocation.city || "Unknown"}"

        - Only set 'city' if user explicitly mentions a city
        `;

      // } else {
      //   contentForAgent += `\n\n(User's city: ${city || "Unknown"}. Do NOT pass coordinates to the search tool.)`;
      // }
    }

    // ✅ Run agent
    const config = {
      configurable: {
        thread_id: threadId ?? "fallback-session",
        userLocation: userLocation
          ? {
            lat: userLocation.lat,
            lon: userLocation.lon,
            city: userLocation.city,
          }
          : null,
      }
    };
    const result = await agent.invoke(
      { messages: [new HumanMessage(contentForAgent)] },
      config
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const response = { role: "assistant", content: lastMessage.content };

    // ✅ Cache original content (not location-appended version)
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