import dotenv from "dotenv";
import { cloudEvent } from "@google-cloud/functions-framework";
import { callAwardsCheck } from "./src/services/awardsCreateGetClient";
import { logger } from "./src/utils/logger";

dotenv.config({ path: "/temp/.env" });

export type PubSubData = {
  message?: {
    data?: string;
    messageId?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
};

type AwardEventPayload = {
  userId?: string;
  eventType?: string;
  occurredAt?: string;
};

function decodePayload(topicMessage: PubSubData): AwardEventPayload | null {
  const base64Data = topicMessage.message?.data;
  if (!base64Data) {
    return null;
  }

  try {
    const raw = Buffer.from(base64Data, "base64").toString("utf8");
    return JSON.parse(raw) as AwardEventPayload;
  } catch {
    return null;
  }
}

export async function consumer(topicMessage: { data?: PubSubData }) {
  const payload = decodePayload(topicMessage.data ?? {});

  if (!payload?.userId) {
    logger.warn("Invalid pubsub payload for awards consumer", {
      messageId: topicMessage.data?.message?.messageId,
      subscription: topicMessage.data?.subscription,
    });
    return null;
  }

  const result = await callAwardsCheck({ userId: payload.userId });

  logger.info("Award event consumed", {
    userId: payload.userId,
    eventType: payload.eventType ?? "unknown",
    messageId: topicMessage.data?.message?.messageId,
    subscription: topicMessage.data?.subscription,
    unlockedCount: result?.data?.unlockedCount,
  });

  return result?.data ?? result;
}

cloudEvent<PubSubData>("consumer", consumer);
