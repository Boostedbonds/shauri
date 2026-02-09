"use client";

import React, { useEffect, useRef, useState } from "react";

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
    <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
      <div className="w-full max-w-3xl flex items-end gap-2 bg-white border border-gray-300 rounded-2xl px-3 py-2 shadow-lg">
        <button
          type="button"
          className="h-10 w-10 rounded-full border border-gray-300 hover:bg-gray-100"
          aria-label="Attach"
        >
          +
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question or answer…"
          rows={1}
          className="flex-1 resize-none overflow-hidden px-2 py-2 text-base focus:outline-none"
        />

        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          className="h-10 px-5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
