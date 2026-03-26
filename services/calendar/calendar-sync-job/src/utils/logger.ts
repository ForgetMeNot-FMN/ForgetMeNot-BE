export type LogLevel = "info" | "error" | "warn" | "debug";

const SERVICE_NAME = "calendar-sync-job";

function log(level: LogLevel, message: string, meta?: unknown) {
  const payload: Record<string, unknown> = {
    service: SERVICE_NAME,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};
