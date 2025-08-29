import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const OPENROUTER_URI = "https://openrouter.ai/api/v1/chat/completions";
  const API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

  try {
    // 1) читаем JSON тела аккуратно
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { messages, system } = body ?? {};

    // 2) валидация входа
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages[] required" },
        { status: 400 }
      );
    }
    if (!API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not set" },
        { status: 500 }
      );
    }

    // 3) таймаут на внешний запрос (30s)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30_000);

    const request = await fetch(OPENROUTER_URI, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        // рекомендованные заголовки OpenRouter (помогают и в дебаге):
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Voice Assistant (dev)",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages,
        ],
        temperature: 0.6,
        max_tokens: 400,
      }),
      signal: controller.signal,
    })
      .catch((err) => {
        throw new Error(`Fetch to OpenRouter failed: ${err.message}`);
      })
      .finally(() => clearTimeout(t));

    // 4) проксируем не-OK статусы с деталями
    if (!request.ok) {
      const raw = await request.text();
      let details: any = raw;
      try {
        details = JSON.parse(raw);
      } catch {}
      console.error("OpenRouter error:", request.status, details);
      return NextResponse.json(
        { error: "Upstream error", status: request.status, details },
        { status: request.status }
      );
    }

    // 5) успешный ответ
    const data = await request.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) {
      console.error(
        "OpenRouter OK but empty content:",
        JSON.stringify(data).slice(0, 800)
      );
      return NextResponse.json(
        { error: "Empty content from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({ content });
  } catch (e) {
    console.error("Route /api/chat fatal:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
