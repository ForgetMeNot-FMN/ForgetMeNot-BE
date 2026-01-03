import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const envs = {
  FIREBASE_SERVICE_ACCOUNT: requireEnv("FIREBASE_SERVICE_ACCOUNT"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  GARDEN_SERVICE_URL: requireEnv("GARDEN_SERVICE_URL"),
  PORT: process.env.PORT || "8080",
};
