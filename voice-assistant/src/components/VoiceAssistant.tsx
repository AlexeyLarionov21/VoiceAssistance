"use client";

import { useRef, useState } from "react";
import { POST } from "@/app/api/chat/route";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function VoiceAssistant() {
  const [recognizing, setRecognizing] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null); // для звука
  const [speaking, setSpeaking] = useState(false);

  const start = () => setRecognizing(true);
  const stop = () => setRecognizing(false);

  const requestLLM = async (userText: string): Promise<string> => {
    const request = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system:
          "You are a concise helpful voice assistant. If user speaks Russian, reply in Russian; if English, reply in English.",
        messages: [
          ...messages, // отвечает за историю чата
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    });

    const data = await request.json();

    if (!request.ok) {
      throw new Error(data?.error || "LLM ERROR");
    }

    return String(data.content ?? "");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const answer = await requestLLM(text);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      await speak(answer); // озвучка
    } catch (exception) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "error: no answer" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const speak = async (text: string) => {
    setSpeaking(true);
    try {
      const request = await fetch("/api/tts", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ text }), // for озвучки
      });

      if (!request.ok) {
        const msg = await request.text().catch(() => ""); //   читаем текст ошибки
        throw new Error(msg || "TTS error");
      }

      const binaryResponce = await request.blob(); //mp3
      const url = URL.createObjectURL(binaryResponce);

      const audio = (audioRef.current ??= new Audio());
      audio.src = url;

      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <section
      aria-label="Voice Assistant"
      className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Voice Assistant</h1>
        <span
          className={`text-xs ${
            recognizing ? "text-green-600" : "text-gray-500"
          }`}
          aria-live="polite"
        >
          {recognizing ? "Слушаю…" : "Ожидаю"}
        </span>
      </header>

      <div className="mb-3 flex items-center gap-2">
        {!recognizing ? (
          <button
            onClick={start}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-black"
            aria-label="Start microphone"
          >
            microphone start
          </button>
        ) : (
          <button
            onClick={stop}
            className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            aria-label="Stop microphone"
          >
            microphone stop
          </button>
        )}

        <button
          onClick={handleSend}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={!input.trim() || loading || speaking}
        >
          {loading ? "..." : "➤ Ask"}
        </button>
        <button
          onClick={() => {
            const audio = audioRef.current;
            if (audio) {
              try {
                audio.pause();
                audio.currentTime = 0;
              } catch {}
            }
          }}
          className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50"
        >
          STOP
        </button>
      </div>

      <textarea
        className="mb-4 h-28 w-full resize-y rounded-lg border p-3"
        placeholder="Скажите что-нибудь (позже микрофон), или введите текст…"
        value={input}
        onChange={(element) => setInput(element.target.value)}
      />
      {/* feed of requests */}
      <div className="space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Сообщений пока нет.</p>
        )}

        {messages.slice(-10).map((msgElement, index) => (
          <div
            key={index}
            className={`rounded-xl p-3 ${
              msgElement.role === "user" ? "bg-gray-100" : "bg-blue-50"
            }`}
          >
            <div className="mb-1 text-xs uppercase text-gray-500">
              {msgElement.role}
            </div>
            <div className="whitespace-pre-wrap">{msgElement.content}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
