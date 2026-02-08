export type Mode = "teacher" | "examiner" | "oral" | "progress";

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export async function sendChatMessage(
  mode: Mode,
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  if (!message.trim()) return "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      message,
      history,
    }),
  });

  if (!res.ok) {
    return "Error: server failed.";
  }

  const data = (await res.json()) as { reply?: string } | null;
  return data?.reply ?? "No response.";
}
