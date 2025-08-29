export const runtime = "nodejs";

import { NextResponse } from "next/server";
// Если локально используешь SOCKS — импортируй включение здесь.
// На Vercel переменную SOCKS_PROXY не задаём, поэтому функция ничего не сделает.
// import { enableSocksProxyFromEnv } from "@/lib/proxy";

interface TtsRequestBody {
  text: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
}

// «Не-магические» значения — собираем в константы:
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.5;

export async function POST(request: Request) {
  try {
    // enableSocksProxyFromEnv?.(); // локально можно включить SOCKS, на Vercel не нужно

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    const unknownBody = (await request.json()) as unknown;

    if (
      typeof unknownBody !== "object" ||
      unknownBody === null ||
      !("text" in unknownBody) ||
      !("voiceId" in unknownBody)
    ) {
      return NextResponse.json(
        { error: "Invalid body: expected { text, voiceId, ...optional }" },
        { status: 400 }
      );
    }

    const { text, voiceId, modelId, outputFormat, stability, similarityBoost } =
      unknownBody as TtsRequestBody;

    if (typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "Field 'text' must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof voiceId !== "string" || voiceId.trim() === "") {
      return NextResponse.json(
        { error: "Field 'voiceId' must be a non-empty string" },
        { status: 400 }
      );
    }

    const resolvedModelId = modelId ?? DEFAULT_MODEL_ID;
    const resolvedOutputFormat = outputFormat ?? DEFAULT_OUTPUT_FORMAT;
    const resolvedStability =
      typeof stability === "number" ? stability : DEFAULT_STABILITY;
    const resolvedSimilarityBoost =
      typeof similarityBoost === "number"
        ? similarityBoost
        : DEFAULT_SIMILARITY_BOOST;

    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}/stream`;

    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: resolvedModelId,
        output_format: resolvedOutputFormat,
        voice_settings: {
          stability: resolvedStability,
          similarity_boost: resolvedSimilarityBoost,
        },
      }),
    });

    if (!upstreamResponse.ok) {
      const contentType = upstreamResponse.headers.get("content-type") || "";
      const status = upstreamResponse.status;
      const statusText = upstreamResponse.statusText;

      let details = "";
      try {
        details = contentType.includes("application/json")
          ? JSON.stringify(await upstreamResponse.json())
          : await upstreamResponse.text();
      } catch {
        // ignore
      }

      return NextResponse.json(
        {
          error: "TTS upstream failed",
          status,
          statusText,
          contentType,
          details,
        },
        { status: 502 }
      );
    }

    const audioBuffer = await upstreamResponse.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="speech.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "TTS route crashed", message },
      { status: 500 }
    );
  }
}
