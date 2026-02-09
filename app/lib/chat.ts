export type Mode = "teacher" | "examiner" | "oral" | "progress";

export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse =
  | { reply: string }
  | { error: string; detail?: string };

export async function sendChatMessage(
  mode: Mode,
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  if (!message || !message.trim()) return "";

  try {
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

    const data = (await res.json()) as ChatResponse;

    if (!res.ok) {
      return data?.error ?? "Server error";
    }

    if ("reply" in data && typeof data.reply === "string") {
      return data.reply;
    }

    return "No response.";
  } catch {
    return "Network error.";
  }
}
