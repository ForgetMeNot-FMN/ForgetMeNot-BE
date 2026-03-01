import { PubSub } from "@google-cloud/pubsub";
import { envs } from "../utils/const";
import { logger } from "../utils/logger";

const pubsub = new PubSub({ projectId: envs.GCP_PROJECT_ID });

export async function triggerAwardCheck(params: {
  userId: string;
  eventType: string;
}): Promise<string | null> {
  try {
    const topic = pubsub.topic(envs.AWARDS_EVENTS_TOPIC);

    const messageId = await topic.publishMessage({
      json: {
        userId: params.userId,
        eventType: params.eventType,
        occurredAt: new Date().toISOString(),
      },
    });

    logger.info("Award event published", {
      userId: params.userId,
      eventType: params.eventType,
      messageId,
    });

    return messageId;
  } catch (error) {
    logger.warn("Award event publish failed", {
      userId: params.userId,
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
