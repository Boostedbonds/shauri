// hooks/usePersistentChat.ts
// Saves and restores the last 10 messages for any mode.
// Usage: const [messages, setMessages] = usePersistentChat("examiner", initialMsg)

import { useEffect, useState, useRef } from "react";

type Message = { role: "user" | "assistant"; content: string };

const MAX_SAVED   = 10;   // max messages kept in localStorage
const KEY_PREFIX  = "shauri_chat_";

function storageKey(mode: string): string {
  return `${KEY_PREFIX}${mode}`;
}

export function usePersistentChat(
  mode: string,
  /** The first greeting message shown before any API call — NOT saved */
  initialMessage: Message | null = null
): [Message[], React.Dispatch<React.SetStateAction<Message[]>>, () => void] {
  const [messages, setMessages] = useState<Message[]>(() => {
    // On first render, load saved messages from localStorage
    try {
      const raw = localStorage.getItem(storageKey(mode));
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    // Fall back to initial greeting (not saved)
    return initialMessage ? [initialMessage] : [];
  });

  const skipSaveRef = useRef(false);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (skipSaveRef.current) { skipSaveRef.current = false; return; }
    if (messages.length === 0) return;

    // Never save the initial local greeting (index 0 only, assistant, no prior save)
    const toSave = messages.slice(-MAX_SAVED);
    try {
      localStorage.setItem(storageKey(mode), JSON.stringify(toSave));
    } catch {}
  }, [messages, mode]);

  // clearHistory: wipe localStorage and reset to initial message
  function clearHistory() {
    try { localStorage.removeItem(storageKey(mode)); } catch {}
    skipSaveRef.current = true;
    setMessages(initialMessage ? [initialMessage] : []);
  }

  return [messages, setMessages, clearHistory];
}