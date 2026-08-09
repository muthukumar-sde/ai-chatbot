import { NextResponse } from "next/server";
import { app as agent } from "@/lib/agent";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { checkSemanticCache, addToSemanticCache, isContextDependent } from "@/lib/agent/cache";
import {
  extractProfileFromText,
  extractStandaloneNameReply,
} from "@/lib/agent/userMemory";
import { prisma } from "@/lib/prisma.js";

function assistantAskedForName(messages) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant?.content) return false;
  const text = String(lastAssistant.content).toLowerCase();
  return /may i know your name|your name\?|name please|name first/.test(text);
}

export async function POST(req) {
  try {
    const { messages, userLocation, threadId, userMemory = {} } = await req.json();
    console.log("mklogs API received messages:", userLocation);
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const content = lastUserMsg?.content?.trim() || "";
    const stableThreadId = threadId ?? "fallback-session";

    // ✅ Skip cache + LLM for empty input
    if (!content) {
      return NextResponse.json({ role: "assistant", content: "Send a message and I'll help you instantly." });
    }

    // ✅ Check if user is asking about their location
    const locationKeywords = ["my location", "where am i", "current location", "my city", "detect location"];
    const isLocationQuery = locationKeywords.some(kw => content.toLowerCase().includes(kw));

    if (isLocationQuery && userLocation) {
      if (userLocation?.city) {
        return NextResponse.json({
          role: "assistant",
          content: `📍 **${userLocation?.city}** — Your current location is in ${userLocation?.city}. How can I help you find properties here?`
        });
      } else {
        return NextResponse.json({
          role: "assistant",
          content: `📍 **Location Detected** — Your location: Lat ${userLocation.lat.toFixed(4)}, Lon ${userLocation.lon.toFixed(4)}. I can use this to find nearby properties for you.`
        });
      }
    }

    const runtimeContextBlocks = [];
    const extracted = extractProfileFromText(content);
    if (!extracted.name && assistantAskedForName(messages)) {
      extracted.name = extractStandaloneNameReply(content);
    }

    const updatedMemory = { ...userMemory };
    for (const [key, value] of Object.entries(extracted)) {
      if (value) {
        updatedMemory[key] = value;
      }
    }

    // Persist memory into Prisma DB
    if (Object.keys(updatedMemory).length > 0 && stableThreadId) {
      try {
        await prisma.userMemory.upsert({
          where: { threadId: stableThreadId },
          update: {
            name: updatedMemory.name || undefined,
            email: updatedMemory.email || undefined,
            phone: updatedMemory.phone || undefined,
            searchType: updatedMemory.search_type || undefined,
          },
          create: {
            threadId: stableThreadId,
            name: updatedMemory.name,
            email: updatedMemory.email,
            phone: updatedMemory.phone,
            searchType: updatedMemory.search_type,
          },
        });
      } catch (e) {
        console.warn("Prisma UserMemory upsert warning:", e.message);
      }
    }

    const hasMemory = Object.keys(updatedMemory).length > 0;

    if (hasMemory) {
      runtimeContextBlocks.push(`USER MEMORY PROFILE:
- userName: ${updatedMemory.name || "unknown"}
- userEmail: ${updatedMemory.email || "unknown"}
- userPhone: ${updatedMemory.phone || "unknown"}
- preferredSearchType: ${updatedMemory.search_type || "unknown"}

MEMORY INSTRUCTION:
- If a profile field is known above, do not ask for it again.
- Address the user by their userName naturally when known.
- Reuse known preferences unless user explicitly changes them.`);
    }
    if (userLocation) {
      runtimeContextBlocks.push(`USER CONTEXT:
- currentUserLocation: ${userLocation.city || "Unknown"}
- nearLat: ${userLocation.lat}
- nearLon: ${userLocation.lon}

INSTRUCTION:
- If user says "near me", "nearby", or does not specify a location:
  -> MUST set:
    nearLat = ${userLocation.lat}
    nearLon = ${userLocation.lon}
    nearPlace = "${userLocation.city || "Unknown"}"
- Only set 'city' if user explicitly mentions a city`);
    }

    // ✅ Run agent
    const config = {
      configurable: {
        thread_id: stableThreadId,
        userLocation: userLocation
          ? {
            lat: userLocation.lat,
            lon: userLocation.lon,
            city: userLocation.city,
          }
          : null,
      }
    };
    const messagesForAgent = [];
    if (runtimeContextBlocks.length > 0) {
      messagesForAgent.push(new SystemMessage(runtimeContextBlocks.join("\n\n")));
    }
    messagesForAgent.push(new HumanMessage(content));

    const result = await agent.invoke({ messages: messagesForAgent }, config);

    const lastMessage = result.messages[result.messages.length - 1];
    const response = { role: "assistant", content: lastMessage.content, userMemory: updatedMemory };

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
