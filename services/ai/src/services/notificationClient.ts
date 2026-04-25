import http from "http";
import https from "https";
import { URL } from "url";
import { NotificationType } from "../models/llmModels";
import { envs } from "../utils/const";

interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  sourceId: string;
  timezone: string;
  type: NotificationType;
}

interface NotificationCreateResponse {
  success: boolean;
  data?: {
    notificationId: string;
  };
  message?: string;
}

function requestJson<T>(
  method: "POST",
  path: string,
  body: unknown,
): Promise<T> {
  const url = new URL(path, envs.NOTIFICATION_SERVICE_URL);
  const client = url.protocol === "https:" ? https : http;
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
          "x-internal-service-secret": envs.INTERNAL_SERVICE_SECRET,
          "x-internal-service-name": "ai-service",
        },
      },
      (res) => {
        let raw = "";

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          const statusCode = res.statusCode ?? 500;
          const parsed = raw ? JSON.parse(raw) : {};

          if (statusCode >= 400) {
            reject(
              new Error(
                parsed?.message ??
                  `Notification service request failed with status ${statusCode}`,
              ),
            );
            return;
          }

          resolve(parsed as T);
        });
      },
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export const notificationClient = {
  async createImmediateLlmNotification(
    params: CreateNotificationParams,
  ): Promise<string> {
    const response = await requestJson<NotificationCreateResponse>(
      "POST",
      `/notifications/${params.userId}`,
      {
        title: params.title,
        body: params.body,
        sourceType: "SYSTEM",
        sourceId: params.sourceId,
        type: params.type,
        priority: "normal",
        enabled: true,
        scheduleType: "IMMEDIATE",
        timezone: params.timezone,
      },
    );

    if (!response.success || !response.data?.notificationId) {
      throw new Error(
        response.message ?? "Notification service did not return notificationId",
      );
    }

    return response.data.notificationId;
  },

  async setGenerationSource(
    notificationId: string,
    generationSource: "LLM" | "SYSTEM",
  ): Promise<void> {
    await requestJson(
      "POST",
      "/notifications/generation-source",
      {
        notificationId,
        generationSource,
      },
    );
  },
};
