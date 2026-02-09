"use client";

import React, { useEffect, useRef } from "react";
import SaveNoteButton from "./SaveNoteButton";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: ChatMessage[];
};

export default function ChatUI({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-3xl space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-2xl px-5 py-4 text-base leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white ml-auto max-w-[85%]"
                : "bg-white border border-gray-200 text-gray-900 mr-auto max-w-[85%]"
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>

            {msg.role === "assistant" && (
              <div className="mt-3 flex justify-end">
                <SaveNoteButton content={msg.content} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
