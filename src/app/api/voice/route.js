import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (!openAiApiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Prepare FormData for OpenAI Whisper API
    const openAiFormData = new FormData();
    openAiFormData.append("file", file);
    openAiFormData.append("model", "whisper-1");
    // Add context to help Whisper recognize domain-specific terminology accurately
    openAiFormData.append("prompt", "Real estate, property, rent, buy, sell, apartment, BHK, house, villa, plot, Coimbatore, Chennai, Bangalore, square feet, landlord, tenant.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: openAiFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI Whisper error:", errorData);
      return NextResponse.json({ error: "Failed to transcribe audio" }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
