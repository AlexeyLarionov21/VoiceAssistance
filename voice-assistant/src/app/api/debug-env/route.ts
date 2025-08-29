import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || null,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || null,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || null,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || null,
    cwd: process.cwd(),
  });
}
