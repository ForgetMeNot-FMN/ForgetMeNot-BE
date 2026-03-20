import { habitRepository } from "./habitRepository";
import { logger } from "../utils/logger";
import { Habit, habitDTO } from "../models/habitModel";
import { v4 as uuidv4 } from "uuid";
import { habitCompletionRepository } from "../repository/habitCompletionRepository";
import dayjs from "dayjs";
import { createHabitNotification, deleteHabitNotifications } from "../clients/notificationClient";
import { publishCalendarEvent } from "../clients/calendarEventPublisher";
import { envs } from "../utils/const";

class HabitService {
  async createHabit(userId: string, habitData: habitDTO): Promise<Habit> {
    console.log("Creating habit for user:", userId, "with data:", habitData);
    const habit: Habit = removeUndefined({
      id: uuidv4(),
      userId,
      title: habitData.title,
      description: habitData.description,
      startDate: habitData.startDate,
      schedule: habitData.schedule,
      type: habitData.type,
      targetValue: habitData.targetValue,
      status: "active",
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Habit object to be created:", habit);
    await habitRepository.create(habit);

    logger.info("Habit created successfully, starting notification creation", {
      userId,
      habitId: habit.id,
    });
    if (habitData.notificationEnabled) {
      try {
        const timezone = habitData.timezone ?? "UTC";
        const timeOfDay = habitData.notificationTime ?? "09:00";
        const sourceId = habit.id;
        logger.info("Creating notification for habit", {
          userId,
          habitId: habit.id,
          timezone,
          timeOfDay,
          notificationPriority: habitData.notificationPriority,
          notificationType: habitData.notificationType,
        });
        if (habit.schedule.type === "weekly") {
          await createHabitNotification({
            userId,
            title: habit.title,
            sourceId,
            sourceType: "HABIT",

            scheduleType: "RECURRING",
            timezone,

            repeatRule: {
              interval: "weekly",
              daysOfWeek: habit.schedule.days,
              timesOfDay: [timeOfDay],
            },

            priority: habitData.notificationPriority,
            type: habitData.notificationType,
          });
        }

        if (habit.schedule.type === "interval") {
          const hour = timeOfDay.split(":")[0];

          await createHabitNotification({
            userId,
            title: habit.title,
            sourceType: "HABIT",
            sourceId,

            scheduleType: "CRON",
            cronExpression: `0 ${hour} */${habit.schedule.everyNDays} * *`,
            timezone,

            priority: habitData.notificationPriority,
            type: habitData.notificationType,
          });
        }

        if (habit.schedule.type === "fixed") {
          for (const date of habit.schedule.dates) {
            await createHabitNotification({
              userId,
              title: habit.title,
              sourceType: "HABIT",
              sourceId,

              scheduleType: "ONCE",
              scheduledAt: new Date(`${date}T${timeOfDay}:00`),
              timezone,

              priority: habitData.notificationPriority,
              type: habitData.notificationType,
            });
          }
        }
        logger.info("Habit creation process completed", {
          userId,
          habitId: habit.id,
        });
      } catch (error) {
        logger.error("Error creating habit notification", {
          error,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        logger.error("Habit created but failed to create notification", {
          userId,
          habitId: habit.id,
        });
      } finally {
        return habit;
      }
    }

    // CalendarEvent Pub/Sub mesajları
    try {
      await publishHabitCalendarEvents(userId, habit);
    } catch (error) {
      logger.warn("Failed to publish calendar events for habit", {
        userId,
        habitId: habit.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return habit;
  }

  async getActiveHabits(userId: string) {
    logger.debug("Get active habits request", { userId });

    const habits = await habitRepository.findActiveByUser(userId);
    if (!habits || habits.length === 0) {
      logger.warn("Habit not found", { userId });
      throw new Error("Habit not found");
    }

    logger.debug("Habit fetched", { userId });

    return habits;
  }

  async getHabit(userId: string, habitId: string) {
    logger.debug("Get habit request", { userId });

    const habit = await habitRepository.findById(habitId, userId);
    if (!habit) {
      logger.warn("Habit not found", { userId });
      throw new Error("Habit not found");
    }

    logger.debug("Habit fetched", { userId });

    return habit;
  }

  async updateHabit(userId: string, habitId: string, body: Partial<habitDTO>) {
    logger.info("Update habit request", { userId, habitId });

    const habit = await habitRepository.findById(habitId, userId);
    if (!habit) throw new Error("Habit not found");

    const updateData: Partial<Habit> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.targetValue !== undefined) updateData.targetValue = body.targetValue;
    if (body.locationTrigger !== undefined) updateData.locationTrigger = body.locationTrigger;

    await habitRepository.update(habitId, updateData);

    const updatedHabit = { ...habit, ...updateData } as Habit;

    if (body.notificationEnabled) {
      try {
        await deleteHabitNotifications(userId, habitId);
        const timezone = body.timezone ?? "UTC";
        const timeOfDay = body.notificationTime ?? "09:00";
        const schedule = updatedHabit.schedule;

        if (schedule.type === "weekly") {
          await createHabitNotification({
            userId,
            title: updatedHabit.title,
            sourceId: habitId,
            sourceType: "HABIT",
            scheduleType: "RECURRING",
            timezone,
            repeatRule: {
              interval: "weekly",
              daysOfWeek: schedule.days,
              timesOfDay: [timeOfDay],
            },
            priority: body.notificationPriority,
            type: body.notificationType,
          });
        } else if (schedule.type === "interval") {
          const hour = timeOfDay.split(":")[0];
          await createHabitNotification({
            userId,
            title: updatedHabit.title,
            sourceId: habitId,
            sourceType: "HABIT",
            scheduleType: "CRON",
            cronExpression: `0 ${hour} */${schedule.everyNDays} * *`,
            timezone,
            priority: body.notificationPriority,
            type: body.notificationType,
          });
        } else if (schedule.type === "fixed") {
          for (const date of schedule.dates) {
            await createHabitNotification({
              userId,
              title: updatedHabit.title,
              sourceId: habitId,
              sourceType: "HABIT",
              scheduleType: "ONCE",
              scheduledAt: new Date(`${date}T${timeOfDay}:00`),
              timezone,
              priority: body.notificationPriority,
              type: body.notificationType,
            });
          }
        }
        logger.info("Habit notifications updated", { userId, habitId });
      } catch (error) {
        logger.error("Failed to update habit notifications", {
          userId,
          habitId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      await publishHabitCalendarEvents(userId, updatedHabit);
    } catch (error) {
      logger.warn("Failed to publish calendar events for habit update", {
        userId,
        habitId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info("Habit updated", { userId, habitId });
    return updatedHabit;
  }

  async deleteHabit(userId: string, habitId: string) {
    logger.warn("Delete habit request", { userId });

    const deletedHabit = await habitRepository.delete(userId, habitId);
    logger.info("Habit deleted", { userId, deletedHabit });

    const deletedNotifications = await deleteHabitNotifications(
      userId,
      habitId,
    );
    logger.info("Habit notifications deleted", {
      userId,
      habitId,
      deletedNotifications,
    });
    return deletedHabit;
  }

  async completeHabit(userId: string, habitId: string) {
    const rewardCoins = envs.HABIT_REWARD_COINS;
    const rewardWater = envs.HABIT_REWARD_WATER;
    const completionData = await habitRepository.completeHabitWithReward(
      userId,
      habitId,
      rewardCoins,
      rewardWater,
    );

    logger.info("User rewarded for habit completion", {
      userId,
      completionData,
    });

    return completionData;
  }
  async getHabitProgress(userId: string, habitId: string, days: number = 7) {
    const habit = await habitRepository.findById(habitId, userId);
    if (!habit) throw new Error("Habit not found");
    const to = dayjs().format("YYYY-MM-DD");
    const from = dayjs()
      .subtract(days - 1, "day")
      .format("YYYY-MM-DD");
    const completions = await habitCompletionRepository.findBetweenDates(
      habitId,
      userId,
      from,
      to,
    );
    const completedDates = new Set(
      completions.filter((c) => c.completed).map((c) => c.date),
    );
    const daily = [];
    let completedCount = 0;
    for (let i = 0; i < days; i++) {
      const date = dayjs(from).add(i, "day").format("YYYY-MM-DD");
      const completed = completedDates.has(date);
      daily.push({ date, completed });
      if (completed) completedCount++;
    }
    const progress = {
      habitId,
      currentStreak: habit.currentStreak,
      weekly: {
        totalDays: days,
        completedDays: completedCount,
        missedDays: days - completedCount,
        completionRate: Math.round((completedCount / days) * 100),
      },
      daily,
    };
    logger.info("Habit progress fetched", { userId, progress });
    return progress;
  }
}

function removeUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined),
  ) as T;
}

async function publishHabitCalendarEvents(userId: string, habit: Habit): Promise<void> {
  if (!habit.schedule) {
    logger.warn("Habit has no schedule, skipping calendar event publish", { habitId: habit.id });
    return;
  }

  const DEFAULT_DURATION_MINUTES = 60;
  const DAYS_AHEAD = 7;
  const today = dayjs().startOf("day");
  const dates: string[] = [];

  if (habit.schedule.type === "weekly") {
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = today.add(i, "day");
      if (habit.schedule.days.includes(day.day())) {
        dates.push(day.format("YYYY-MM-DD"));
      }
    }
  } else if (habit.schedule.type === "interval") {
    const start = dayjs(habit.schedule.startDate).startOf("day");
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const candidate = start.add(i * habit.schedule.everyNDays, "day");
      if (candidate.isBefore(today.add(DAYS_AHEAD, "day"))) {
        dates.push(candidate.format("YYYY-MM-DD"));
      }
    }
  } else if (habit.schedule.type === "fixed") {
    dates.push(...habit.schedule.dates);
  }

  for (const date of dates) {
    const startTime = dayjs(`${date}T09:00:00`).toISOString();
    const endTime = dayjs(`${date}T09:00:00`).add(DEFAULT_DURATION_MINUTES, "minute").toISOString();
    await publishCalendarEvent({
      userId,
      provider: "fmn",
      sourceType: "habit",
      habitId: habit.id,
      title: habit.title,
      startTime,
      endTime,
      isAllDay: false,
      checkConflict: false,
    });
  }

  logger.info("Habit calendar events published", {
    userId,
    habitId: habit.id,
    count: dates.length,
  });
}

export const habitService = new HabitService();
