export type LogLevel = "info" | "error" | "warn" | "debug";

const SERVICE_NAME = "auth-service";

function log(level: LogLevel, message: string, meta?: any) {
  const payload: any = {
    service: SERVICE_NAME,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    payload.meta = meta;
  }

  // Cloud Run stdout/stderr'e giden her şey log olarak görünür
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info: (msg: string, meta?: any) => log("info", msg, meta),
  error: (msg: string, meta?: any) => log("error", msg, meta),
  warn: (msg: string, meta?: any) => log("warn", msg, meta),
  debug: (msg: string, meta?: any) => log("debug", msg, meta),
};
