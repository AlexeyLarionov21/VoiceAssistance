import { NextRequest, NextResponse } from "next/server";

type Role = "user" | "assistant" | "system";

interface ChatMessage {
  role: Role;
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.role === "user" ||
      record.role === "assistant" ||
      record.role === "system") &&
    typeof record.content === "string"
  );
}

export async function POST(request: Request) {
  try {
    const unknownBody = (await request.json()) as unknown;

    if (
      typeof unknownBody !== "object" ||
      unknownBody === null ||
      !("message" in unknownBody)
    ) {
      return NextResponse.json(
        { error: "Invalid request body: expected { message, history? }" },
        { status: 400 }
      );
    }

    const { message, history } = unknownBody as ChatRequestBody;

    if (typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "Field 'message' must be a non-empty string" },
        { status: 400 }
      );
    }

    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter(isChatMessage)
      : [];

    const replyText = `Эхо: ${message}`;

    return NextResponse.json({
      reply: replyText,
      history: safeHistory,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
