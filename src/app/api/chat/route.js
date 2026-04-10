import { NextRequest, NextResponse } from "next/server";
import { app as agent } from "@/lib/agent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req) {
  try {
    const { messages, userLocation } = await req.json();

    // The checkpointer in the agent handles full conversation memory,
    // so we only need to send the latest user message
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    let content = lastUserMsg?.content || "";

    // Append user location if available
    if (userLocation) {
      content += `\n\n(User's current location: Lat ${userLocation.lat}, Lon ${userLocation.lon})`;
    }

    const config = { configurable: { thread_id: "user-session-1" } };

    // Run the agent
    const result = await agent.invoke(
      { messages: [new HumanMessage(content)] },
      config
    );

    const lastMessage = result.messages[result.messages.length - 1];

    return NextResponse.json({
      role: "assistant",
      content: lastMessage.content,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
