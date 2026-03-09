import { InternalEvent } from "../models/internalCalendarModel";

export const normalizeGoogleEvent = (event: any, userId: string): InternalEvent => {
  return {
    userId,
    provider: "google",
    externalEventId: event.id ?? "",
    taskId: undefined,
    habitId: undefined,
    startTime: event.start?.dateTime ?? event.start?.date ?? "",
    endTime: event.end?.dateTime ?? event.end?.date ?? "",
    checkConflict: true,
    lastSyncedAt: new Date()
  };
};