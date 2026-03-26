import dayjs from "dayjs";
import { google } from "googleapis";
import { v5 as uuidv5 } from "uuid";
import { ConflictItem, ConflictRecord } from "../models/conflictModel";
import { Habit } from "../models/habitModel";
import { InternalCalendarEvent } from "../models/internalCalendarModel";
import { calendarRepository } from "../repositories/calendarRepository";
import { sourceRepository } from "../repositories/sourceRepository";
import { normalizeGoogleEvent } from "../utils/eventNormalizer";
import { logger } from "../utils/logger";

const MAX_RANGE_DAYS = 31;
const CONFLICT_NAMESPACE = "8a7c2d90-6dfd-4ce2-b7d2-2f6c1aa52f6f";

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

export async function projectHabitEvents(
  from?: string,
  to?: string,
) {
  const rangeFrom = from ?? dayjs().startOf("day").toISOString();
  const rangeTo = to ?? dayjs().add(30, "day").endOf("day").toISOString();

  await validateDateRange(rangeFrom, rangeTo);

  const habits = await sourceRepository.getActiveHabits();
  const events: InternalCalendarEvent[] = [];

  for (const habit of habits) {
    const habitEvents = await buildHabitCalendarEvents(habit, rangeFrom, rangeTo);
    events.push(...habitEvents);
  }

  const result = await calendarRepository.upsertCalendarEvents(events);

  logger.info("Projected habit calendar events", {
    from: rangeFrom,
    to: rangeTo,
    totalHabits: habits.length,
    totalEvents: events.length,
    insertedCount: result.insertedCount,
    updatedCount: result.updatedCount,
  });

  return {
    from: rangeFrom,
    to: rangeTo,
    totalHabits: habits.length,
    totalEvents: events.length,
    insertedCount: result.insertedCount,
    updatedCount: result.updatedCount,
  };
}

export async function projectHabitEventsByUser(
  userId: string,
  from?: string,
  to?: string,
) {
  const rangeFrom = from ?? dayjs().startOf("day").toISOString();
  const rangeTo = to ?? dayjs().add(30, "day").endOf("day").toISOString();

  await validateDateRange(rangeFrom, rangeTo);

  const habits = await sourceRepository.getActiveHabitsByUser(userId);
  const events: InternalCalendarEvent[] = [];

  for (const habit of habits) {
    const habitEvents = await buildHabitCalendarEvents(habit, rangeFrom, rangeTo);
    events.push(...habitEvents);
  }

  const result = await calendarRepository.upsertCalendarEvents(events);

  logger.info("Projected user habit calendar events", {
    userId,
    from: rangeFrom,
    to: rangeTo,
    totalHabits: habits.length,
    totalEvents: events.length,
    insertedCount: result.insertedCount,
    updatedCount: result.updatedCount,
  });

  return {
    userId,
    from: rangeFrom,
    to: rangeTo,
    totalHabits: habits.length,
    totalEvents: events.length,
    insertedCount: result.insertedCount,
    updatedCount: result.updatedCount,
  };
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

  const events = await calendarRepository.getCalendarEventsByDateRange(
    userId,
    from,
    to,
  );

  const googleEvents = events.filter(
    (event) =>
      event.provider === "google" &&
      event.checkConflict &&
      event.status !== "cancelled",
  );
  const fmnEvents = events.filter(
    (event) =>
      event.provider === "fmn" &&
      event.checkConflict &&
      (!event.status || event.status !== "cancelled"),
  );
  const conflicts: ConflictRecord[] = [];
  const detectedAt = new Date().toISOString();

  for (const event of googleEvents) {
    for (const fmnEvent of fmnEvents) {
      if (
        event.startTime < fmnEvent.endTime &&
        fmnEvent.startTime < event.endTime
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
        const fmnItem: ConflictItem = {
          sourceType: fmnEvent.taskId ? "task" : "habit",
          sourceId: fmnEvent.taskId ?? fmnEvent.habitId ?? fmnEvent.id,
          provider: "fmn",
          title: fmnEvent.title,
          startTime: fmnEvent.startTime,
          endTime: fmnEvent.endTime,
        };
        const items = [googleItem, fmnItem].sort((left, right) =>
          [left.sourceType, left.sourceId, left.provider || "none"]
            .join(":")
            .localeCompare(
              [right.sourceType, right.sourceId, right.provider || "none"].join(
                ":",
              ),
            ),
        );
        const itemKeys = items.map((item) =>
          [item.sourceType, item.sourceId, item.provider || "none"].join(":"),
        );
        const startsAt = items.map((item) => item.startTime).sort()[0];
        const endsAt = items.map((item) => item.endTime).sort().slice(-1)[0];

        conflicts.push({
          conflictId: uuidv5(
            [userId, "google_vs_fmn", ...itemKeys, startsAt, endsAt].join("|"),
            CONFLICT_NAMESPACE,
          ),
          userId,
          type: "google_vs_fmn",
          itemKeys,
          detectedAt,
          startsAt,
          endsAt,
          items,
          status: "open",
          updatedAt: detectedAt,
        });
      }
    }
  }

  for (let index = 0; index < fmnEvents.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < fmnEvents.length; innerIndex += 1) {
      const left = fmnEvents[index];
      const right = fmnEvents[innerIndex];

      if (
        left.startTime < right.endTime &&
        right.startTime < left.endTime
      ) {
        const leftItem: ConflictItem = {
          sourceType: left.taskId ? "task" : "habit",
          sourceId: left.taskId ?? left.habitId ?? left.id,
          provider: "fmn",
          title: left.title,
          startTime: left.startTime,
          endTime: left.endTime,
        };
        const rightItem: ConflictItem = {
          sourceType: right.taskId ? "task" : "habit",
          sourceId: right.taskId ?? right.habitId ?? right.id,
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
        const itemKeys = items.map((item) =>
          [item.sourceType, item.sourceId, item.provider || "none"].join(":"),
        );
        const startsAt = items.map((item) => item.startTime).sort()[0];
        const endsAt = items.map((item) => item.endTime).sort().slice(-1)[0];

        conflicts.push({
          conflictId: uuidv5(
            [userId, "fmn_vs_fmn", ...itemKeys, startsAt, endsAt].join("|"),
            CONFLICT_NAMESPACE,
          ),
          userId,
          type: "fmn_vs_fmn",
          itemKeys,
          detectedAt,
          startsAt,
          endsAt,
          items,
          status: "open",
          updatedAt: detectedAt,
        });
      }
    }
  }

  await calendarRepository.saveConflicts(conflicts);

  return conflicts;
}

export async function resolveConflict(
  userId: string,
  conflictId: string,
  action: "continue" | "cancel",
) {
  const conflict = await calendarRepository.getConflictById(conflictId);

  if (!conflict || conflict.userId !== userId) {
    throw new Error("Conflict not found");
  }

  if (conflict.status !== "open") {
    return {
      conflictId,
      status: conflict.status,
      updatedCalendarEvents: 0,
      skipped: true,
    };
  }

  let updatedCalendarEvents = 0;
  let deletedTasks = 0;

  if (action === "continue") {
    for (const item of conflict.items) {
      if (item.provider !== "fmn") {
        continue;
      }

      if (item.sourceType === "task") {
        updatedCalendarEvents += await calendarRepository.updateCheckConflictByTaskId(
          item.sourceId,
          false,
        );
      }

      if (item.sourceType === "habit") {
        updatedCalendarEvents += await calendarRepository.updateCheckConflictByHabitId(
          item.sourceId,
          false,
        );
      }
    }

    await calendarRepository.updateConflictStatus(
      conflictId,
      "resolved_continue",
    );
  }

  if (action === "cancel") {
    for (const item of conflict.items) {
      if (item.sourceType !== "task" || item.provider !== "fmn") {
        continue;
      }

      await sourceRepository.deleteTask(item.sourceId);
      await calendarRepository.deleteCalendarEventsByTaskId(item.sourceId);
      deletedTasks += 1;
    }

    await calendarRepository.updateConflictStatus(
      conflictId,
      "resolved_cancel",
    );

    return {
      conflictId,
      status: "resolved_cancel",
      updatedCalendarEvents: 0,
      deletedTasks,
      skipped: deletedTasks === 0,
    };
  }

  return {
    conflictId,
    status: "resolved_continue",
    updatedCalendarEvents,
    deletedTasks: 0,
    skipped: false,
  };
}

async function buildHabitCalendarEvents(
  habit: Habit,
  from: string,
  to: string,
): Promise<InternalCalendarEvent[]> {
  if (!habit.schedule) {
    return [];
  }

  const rangeStart = dayjs(from).startOf("day");
  const rangeEnd = dayjs(to).endOf("day");
  const timeOfDay = habit.notificationTime ?? "09:00";
  const dates: string[] = [];

  if (habit.schedule.type === "weekly") {
    let current = rangeStart;
    while (current.isBefore(rangeEnd) || current.isSame(rangeEnd, "day")) {
      if (habit.schedule.days.includes(current.day())) {
        dates.push(current.format("YYYY-MM-DD"));
      }
      current = current.add(1, "day");
    }
  }

  if (habit.schedule.type === "interval") {
    const start = dayjs(habit.schedule.startDate).startOf("day");
    const everyN = habit.schedule.everyNDays;

    if (everyN > 0) {
      const daysSinceStart = rangeStart.diff(start, "day");
      const intervalsElapsed = Math.max(0, Math.floor(daysSinceStart / everyN));
      let candidate = start.add(intervalsElapsed * everyN, "day");

      while (candidate.isBefore(rangeEnd) || candidate.isSame(rangeEnd, "day")) {
        if (!candidate.isBefore(rangeStart)) {
          dates.push(candidate.format("YYYY-MM-DD"));
        }
        candidate = candidate.add(everyN, "day");
      }
    }
  }

  if (habit.schedule.type === "fixed") {
    for (const date of habit.schedule.dates) {
      const day = dayjs(date).startOf("day");
      if (
        (day.isAfter(rangeStart) || day.isSame(rangeStart, "day")) &&
        (day.isBefore(rangeEnd) || day.isSame(rangeEnd, "day"))
      ) {
        dates.push(day.format("YYYY-MM-DD"));
      }
    }
  }

  return dates.map((date) => {
    const startTime = dayjs(`${date}T${timeOfDay}:00`).toISOString();
    const endTime = dayjs(`${date}T${timeOfDay}:00`)
      .add(60, "minute")
      .toISOString();

    return {
      id: `${habit.id}_${startTime}`,
      userId: habit.userId,
      provider: "fmn",
      habitId: habit.id,
      title: habit.title,
      startTime,
      endTime,
      isAllDay: false,
      checkConflict: false,
      lastSyncedAt: new Date(),
    };
  });
}
