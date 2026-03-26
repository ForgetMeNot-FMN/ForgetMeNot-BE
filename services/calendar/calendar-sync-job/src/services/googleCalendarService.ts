import { google } from "googleapis";
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

const removeUndefined = <T extends object>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as T;
};

const normalizeGoogleEvent = (
  event: any,
  userId: string,
): InternalCalendarEvent | null => {
  const startTime = toIsoString(event.start?.dateTime ?? event.start?.date);
  const endTime = toIsoString(event.end?.dateTime ?? event.end?.date);

  if (!event.id || !startTime || !endTime) {
    return null;
  }

  return removeUndefined({
    id: `${userId}_${event.id}`,
    userId,
    provider: "google" as const,
    externalEventId: event.id,
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

export const googleCalendarService = {
  async getEventsByDateRange(
    accessToken: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<InternalCalendarEvent[]> {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });
    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: from,
      timeMax: to,
    });

    return (response.data.items || [])
      .map((event) => normalizeGoogleEvent(event, userId))
      .filter((event): event is InternalCalendarEvent => event !== null);
  },
};
