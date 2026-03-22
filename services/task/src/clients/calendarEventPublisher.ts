import { PubSub } from "@google-cloud/pubsub";
import { envs } from "../utils/const";
import { logger } from "../utils/logger";

const pubsub = new PubSub({
  projectId: envs.GCP_PROJECT_ID
});

export interface CalendarEventMessage {
  action: "create" | "delete";
  userId: string;
  provider: "fmn";
  sourceType: "task";
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  checkConflict: boolean;
}

export interface CalendarDeleteMessage {
  action: "delete";
  userId: string;
  provider: "fmn";
  sourceType: "task";
  taskId: string;
}

export async function publishCalendarEvent(
  message: CalendarEventMessage,
): Promise<string | null> {
  try {
    const topic = pubsub.topic(envs.CALENDAR_EVENTS_TOPIC);
    const messageId = await topic.publishMessage({ json: message });
    logger.info("CalendarEvent published", {
      userId: message.userId,
      taskId: message.taskId,
      startTime: message.startTime,
      messageId,
    });
    return messageId;
  } catch (error) {
    logger.warn("CalendarEvent publish failed", {
      userId: message.userId,
      taskId: message.taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function publishCalendarDeleteEvent(
  userId: string,
  taskId: string,
): Promise<string | null> {
  const message: CalendarDeleteMessage = {
    action: "delete",
    userId,
    provider: "fmn",
    sourceType: "task",
    taskId,
  };
  try {
    const topic = pubsub.topic(envs.CALENDAR_EVENTS_TOPIC);
    const messageId = await topic.publishMessage({ json: message });
    logger.info("CalendarDeleteEvent published", { userId, taskId, messageId });
    return messageId;
  } catch (error) {
    logger.warn("CalendarDeleteEvent publish failed", {
      userId,
      taskId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
