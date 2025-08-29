import { NextRequest, NextResponse } from "next/server";
import { ProxyAgent } from "undici";
import { enableSocksProxyFromEnv } from "@/lib/proxy";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    //enableSocksProxyFromEnv();

    const { text } = await req.json();
    const API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "MYw0upsxdtxs1n97djly"; // любой доступный голос
    const ELEVENLABS_URI = "https://api.elevenlabs.io/v1/text-to-speech";

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not set" },
        { status: 500 }
      );
    }

    // Запрос к ElevenLabs TTS
    const request = await fetch(`${ELEVENLABS_URI}/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY, // требование самой лабы по типу ключа
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // хорошо читает RU/EN
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!request.ok) {
      const errText = await request.text();
      console.log(errText + "req er");
      return NextResponse.json(
        { error: errText || "TTS error" },
        { status: request.status }
      );
    }

    const arrayBuf = await request.arrayBuffer(); // Возвращаем бинарный аудио-стрим клиенту
    return new NextResponse(arrayBuf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
