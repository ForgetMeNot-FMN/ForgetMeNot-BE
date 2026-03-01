import { envs } from "../utils/const";
import { logger } from "../utils/logger";

export async function callAwardsCheck(params: { userId: string }) {
  const baseUrl = envs.AWARDS_CREATE_GET_URL.replace(/\/$/, "");
  const url = `${baseUrl}/awards/internal/${params.userId}/check`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": envs.INTERNAL_SERVICE_TOKEN,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Awards create-get check call failed", {
      userId: params.userId,
      status: response.status,
      body,
    });
    throw new Error(`Awards check failed (${response.status})`);
  }

  return response.json();
}
