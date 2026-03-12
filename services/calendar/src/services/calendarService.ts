import dayjs from "dayjs";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import { ConflictItem, ConflictRecord } from "../models/conflictModel";
import { InternalCalendarEvent } from "../models/internalCalendarModel";
import { calendarRepository } from "../repositories/calendarRepository";
import { taskRepository } from "../repositories/taskRepository";
import { normalizeGoogleEvent } from "../utils/eventNormalizer";
import { logger } from "../utils/logger";

const MAX_RANGE_DAYS = 31;
export async function validateDateRange(from: string, to: string) {
  const fromDate = dayjs(from);
  const toDate = dayjs(to);

  if (!fromDate.isValid() || !toDate.isValid()) {
    throw new Error("Invalid date range");
  }

  if (!fromDate.isBefore(toDate)) {
    throw new Error("Invalid date range");
  }

  if (toDate.diff(fromDate, "day", true) > MAX_RANGE_DAYS) {
    throw new Error("Date range cannot exceed 31 days");
  }
}

export async function getGoogleEvents(
  accessToken: string,
  userId: string,
  from?: string,
  to?: string,
): Promise<InternalCalendarEvent[]> {
  try {

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });
   
    const response = await calendar.events.list({
      calendarId: "primary",
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: from ?? new Date().toISOString(),
      ...(to ? { timeMax: to } : {}),
    });

    const events = (response.data.items || [])
      .map((event) => normalizeGoogleEvent(event, userId))
      .filter((event): event is InternalCalendarEvent => event !== null);

    logger.info("Fetched events from Google", {
      userId,
      from,
      to,
      count: events.length,
    });

    return events;
  } catch (error) {
    logger.error("Google Calendar API error", { userId, from, to, error });
    throw new Error("Google Calendar fetch failed");
  }
}

export async function getUserEventsByDateRange(
  accessToken: string,
  userId: string,
  from: string,
  to: string,
) {
  await validateDateRange(from, to);

  try {
    const events = await getGoogleEvents(accessToken, userId, from, to);
    const { insertedCount, updatedCount } =
      await calendarRepository.upsertCalendarEvents(events);

    logger.info("Fetched and stored calendar events", {
      userId,
      from,
      to,
      syncedCount: events.length,
      insertedCount,
      updatedCount,
    });

    return {
      syncedCount: events.length,
      insertedCount,
      updatedCount,
      events,
    };
  } catch (error) {
    logger.error("Google Calendar API error", { userId, from, to, error });
    throw new Error("Google Calendar fetch failed");
  }
}

export async function detectConflictsByDateRange(
  userId: string,
  from: string,
  to: string,
) {
  await validateDateRange(from, to);

  const [events, tasks] = await Promise.all([
    calendarRepository.getCalendarEventsByDateRange(userId, from, to),
    taskRepository.getTasksByDateRange(userId, from, to),
  ]);

  const filteredEvents = events.filter(
    (event) => event.checkConflict && event.status !== "cancelled",
  );
  const conflicts: ConflictRecord[] = [];

  for (const event of filteredEvents) {
    for (const task of tasks) {
      if (
        event.startTime < task.endTime &&
        task.startTime < event.endTime
      ) {
        const googleItem: ConflictItem = {
          sourceType: "calendar_event",
          sourceId: event.id,
          provider: "google",
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          checkConflict: event.checkConflict,
        };
        const taskItem: ConflictItem = {
          sourceType: "task",
          sourceId: task.taskId,
          provider: "fmn",
          title: task.title,
          startTime: task.startTime,
          endTime: task.endTime,
        };
        const items = [googleItem, taskItem].sort((left, right) =>
          [left.sourceType, left.sourceId, left.provider || "none"]
            .join(":")
            .localeCompare(
              [right.sourceType, right.sourceId, right.provider || "none"].join(
                ":",
              ),
            ),
        );

        conflicts.push({
          conflictId: uuidv4(),
          userId,
          type: "google_vs_fmn",
          itemKeys: items.map((item) =>
            [item.sourceType, item.sourceId, item.provider || "none"].join(":"),
          ),
          detectedAt: new Date().toISOString(),
          startsAt: items.map((item) => item.startTime).sort()[0],
          endsAt: items.map((item) => item.endTime).sort().slice(-1)[0],
          items,
          status: "open",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  for (let index = 0; index < tasks.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < tasks.length; innerIndex += 1) {
      const left = tasks[index];
      const right = tasks[innerIndex];

      if (
        left.startTime < right.endTime &&
        right.startTime < left.endTime
      ) {
        const leftItem: ConflictItem = {
          sourceType: "task",
          sourceId: left.taskId,
          provider: "fmn",
          title: left.title,
          startTime: left.startTime,
          endTime: left.endTime,
        };
        const rightItem: ConflictItem = {
          sourceType: "task",
          sourceId: right.taskId,
          provider: "fmn",
          title: right.title,
          startTime: right.startTime,
          endTime: right.endTime,
        };
        const items = [leftItem, rightItem].sort((first, second) =>
          [first.sourceType, first.sourceId, first.provider || "none"]
            .join(":")
            .localeCompare(
              [second.sourceType, second.sourceId, second.provider || "none"].join(
                ":",
              ),
            ),
        );

        conflicts.push({
          conflictId: uuidv4(),
          userId,
          type: "fmn_vs_fmn",
          itemKeys: items.map((item) =>
            [item.sourceType, item.sourceId, item.provider || "none"].join(":"),
          ),
          detectedAt: new Date().toISOString(),
          startsAt: items.map((item) => item.startTime).sort()[0],
          endsAt: items.map((item) => item.endTime).sort().slice(-1)[0],
          items,
          status: "open",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  await calendarRepository.saveConflicts(conflicts);

  return conflicts;
}
