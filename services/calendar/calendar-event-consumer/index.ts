import { cloudEvent } from "@google-cloud/functions-framework";
import { firestore } from "./src/firebaseAdmin";
import { logger } from "./src/utils/logger";
import { v4 as uuidv4 } from "uuid";

const CALENDAR_EVENTS_COLLECTION = "calendar_events";

type PubSubData = {
  message?: {
    data?: string;
    messageId?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
};

type CalendarEventPayload = {
  userId: string;
  provider: "fmn" | "google";
  sourceType: "task" | "habit";
  taskId?: string;
  habitId?: string;
  externalEventId?: string;
  title?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  checkConflict: boolean;
};

function decodePayload(topicMessage: PubSubData): CalendarEventPayload | null {
  const base64Data = topicMessage.message?.data;
  if (!base64Data) return null;
  try {
    const raw = Buffer.from(base64Data, "base64").toString("utf8");
    return JSON.parse(raw) as CalendarEventPayload;
  } catch {
    return null;
  }
}

export async function consumer(topicMessage: { data?: PubSubData }) {
  const payload = decodePayload(topicMessage.data ?? {});
  const messageId = topicMessage.data?.message?.messageId;

  if (!payload?.userId || !payload.startTime || !payload.endTime) {
    logger.warn("Invalid calendar event payload", { messageId });
    return null;
  }

  let eventId: string;
  if (payload.provider === "google" && payload.externalEventId) {
    eventId = payload.externalEventId;
  } else if (payload.taskId) {
    eventId = payload.taskId;
  } else if (payload.habitId) {
    eventId = `${payload.habitId}_${payload.startTime}`;
  } else {
    eventId = uuidv4();
  }
  const doc = {
    id: eventId,
    userId: payload.userId,
    provider: payload.provider,
    taskId: payload.taskId ?? null,
    habitId: payload.habitId ?? null,
    title: payload.title ?? null,
    startTime: payload.startTime,
    endTime: payload.endTime,
    externalEventId: payload.externalEventId ?? null,
    isAllDay: payload.isAllDay ?? false,
    checkConflict: payload.checkConflict ?? false,
    lastSyncedAt: new Date().toISOString(),
  };

  await firestore.collection(CALENDAR_EVENTS_COLLECTION).doc(eventId).set(doc);

  logger.info("CalendarEvent saved", {
    eventId,
    userId: payload.userId,
    provider: payload.provider,
    sourceType: payload.sourceType,
    taskId: payload.taskId,
    habitId: payload.habitId,
    messageId,
  });

  return { eventId };
}

cloudEvent<PubSubData>("consumer", consumer);
