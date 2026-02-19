import { habitRepository } from "./habitRepository";
import { logger } from "../utils/logger";
import { Habit, habitDTO } from "../models/habitModel";
import { v4 as uuidv4 } from "uuid";
import { habitCompletionRepository } from "../repository/habitCompletionRepository";
import { gardenRepository } from "../repository/gardenRepository";
import dayjs from "dayjs";
import { createHabitNotification, deleteHabitNotifications } from "../clients/notificationClient";

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
        const timezone = habitData.timezone ?? "Europe/Istanbul";
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
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

    const habit = await habitRepository.findById(habitId, userId);
    if (!habit) throw new Error("Habit not found");

    const todayCompletion = await habitCompletionRepository.getByHabitAndDate(
      habitId,
      userId,
      today,
    );

    if (todayCompletion) {
      logger.info("Habit already completed today", {
        userId,
        habitId,
        today,
      });

      return {
        habitId,
        currentStreak: habit.currentStreak,
        rewarded: { coins: 0, water: 0 },
        alreadyCompleted: true,
      };
    }

    await habitCompletionRepository.create({
      habitId,
      userId,
      date: today,
      completed: true,
      rewardGranted: true,
      coins: 5,
      water: 1,
    });

    const yesterdayCompletion =
      await habitCompletionRepository.getByHabitAndDate(
        habitId,
        userId,
        yesterday,
      );

    const newStreak = yesterdayCompletion ? habit.currentStreak + 1 : 1;

    await habitRepository.update(habitId, {
      currentStreak: newStreak,
      longestStreak: Math.max(habit.longestStreak, newStreak),
      updatedAt: new Date(),
    });

    await gardenRepository.rewardUser(userId);

    const completionData = {
      habitId,
      currentStreak: newStreak,
      rewarded: { coins: 5, water: 1 },
      alreadyCompleted: false,
    };

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

export const habitService = new HabitService();
