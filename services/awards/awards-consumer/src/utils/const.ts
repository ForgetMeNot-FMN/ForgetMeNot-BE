import dotenv from "dotenv";
dotenv.config({ path: "/temp/.env" });
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const envs = {
  GCP_PROJECT_ID: requireEnv("GCP_PROJECT_ID"),
  AWARDS_CREATE_GET_URL: requireEnv("AWARDS_CREATE_GET_URL"),
  INTERNAL_SERVICE_TOKEN: requireEnv("INTERNAL_SERVICE_TOKEN"),
};
