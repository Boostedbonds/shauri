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

    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      return (
        data?.error ||
        data?.detail ||
        `Server error (${res.status})`
      );
    }

    if (!data || typeof data.reply !== "string") {
      return "No response from AI.";
    }

    return data.reply;
  } catch (err) {
    return "Network or runtime error.";
  }
}
