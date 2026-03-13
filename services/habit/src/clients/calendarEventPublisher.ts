import { PubSub } from "@google-cloud/pubsub";
import { envs } from "../utils/const";
import { logger } from "../utils/logger";

const pubsub = new PubSub({
  projectId: envs.GCP_PROJECT_ID
});

export interface CalendarEventMessage {
  userId: string;
  provider: "fmn";
  sourceType: "habit";
  habitId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  checkConflict: boolean;
}

export async function publishCalendarEvent(
  message: CalendarEventMessage,
): Promise<string | null> {
  try {
    const topic = pubsub.topic(envs.CALENDAR_EVENTS_TOPIC);
    const messageId = await topic.publishMessage({ json: message });
    logger.info("CalendarEvent published", {
      userId: message.userId,
      habitId: message.habitId,
      startTime: message.startTime,
      messageId,
    });
    return messageId;
  } catch (error) {
    logger.warn("CalendarEvent publish failed", {
      userId: message.userId,
      habitId: message.habitId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
