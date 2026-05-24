import "server-only";

type Level = "info" | "warn" | "error";

export function adminLog(level: Level, event: string, data: Record<string, unknown> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    scope: "admin",
    level,
    event,
    ...data,
  };
  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

