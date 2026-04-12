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
  GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  PORT: process.env.PORT || "8080",
};
