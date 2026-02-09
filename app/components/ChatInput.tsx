"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (text: string) => void;
};

export default function ChatInput({ onSend }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t bg-gray-50 py-6">
      {/* Centered container like ChatGPT */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-end gap-3 rounded-2xl border bg-white px-4 py-3 shadow-lg">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-base leading-relaxed focus:outline-none"
            style={{ minHeight: "48px" }}
          />

          <button
            onClick={send}
            disabled={!text.trim()}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
