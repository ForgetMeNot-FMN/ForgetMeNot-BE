import { InternalCalendarEvent } from "../models/internalCalendarModel";

const toIsoString = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const normalizeGoogleEvent = (
  event: any,
  userId: string,
): InternalCalendarEvent | null => {
  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  const startTime = toIsoString(startRaw);
  const endTime = toIsoString(endRaw);

  if (!event.id || !startTime || !endTime) {
    return null;
  }

  const id = `${userId}_${event.id}`;

  return removeUndefined({
    id,
    userId,
    provider: "google",
    externalEventId: event.id ?? "",
    taskId: undefined,
    title: event.summary ?? "",
    description: event.description ?? "",
    startTime,
    endTime,
    isAllDay: Boolean(event.start?.date && !event.start?.dateTime),
    status: event.status ?? "confirmed",
    checkConflict: true,
    lastSyncedAt: new Date(),
  });
};

const removeUndefined = <T extends object>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as T;
};
