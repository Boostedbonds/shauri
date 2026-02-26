// lib/persistentChat.ts
// Drop-in helpers for any mode page to persist last 10 messages across refresh.
//
// Usage in any mode page:
//
//   import { loadChat, saveChat, clearChat } from "../lib/persistentChat";
//
//   // On mount:
//   const saved = loadChat("teacher");
//   setMessages(saved.length > 0 ? saved : [{ role: "assistant", content: greeting }]);
//
//   // After setMessages:
//   useEffect(() => { saveChat("teacher", messages); }, [messages]);
//
//   // On logout or new session:
//   clearChat("teacher");

type Message = { role: "user" | "assistant"; content: string };

const PREFIX  = "shauri_chat_";
const MAX_MSG = 10;

export function loadChat(mode: string): Message[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${mode}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [];
}

export function saveChat(mode: string, messages: Message[]): void {
  if (messages.length === 0) return;
  try {
    localStorage.setItem(`${PREFIX}${mode}`, JSON.stringify(messages.slice(-MAX_MSG)));
  } catch {}
}

export function clearChat(mode: string): void {
  try { localStorage.removeItem(`${PREFIX}${mode}`); } catch {}
}

export function clearAllChats(): void {
  const modes = ["teacher", "oral", "practice", "revision", "examiner"];
  modes.forEach(clearChat);
}