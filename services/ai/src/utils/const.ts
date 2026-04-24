import dotenv from "dotenv";

dotenv.config({ path: "/temp/.env" });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const envs = {
  FIREBASE_SERVICE_ACCOUNT: requireEnv("FIREBASE_SERVICE_ACCOUNT"),
  INTERNAL_SERVICE_SECRET: requireEnv("INTERNAL_SERVICE_SECRET"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  CHAT_ENCRYPTION_KEY: requireEnv("CHAT_ENCRYPTION_KEY"),
  NOTIFICATION_SERVICE_URL: requireEnv("NOTIFICATION_SERVICE_URL"),
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  SERVICE_PORT: process.env.SERVICE_PORT || "8080",
};
