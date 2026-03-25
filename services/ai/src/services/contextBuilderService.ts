import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import {
  BuildUserContextOptions,
  DailyActivitySnapshot,
  HabitCompletionRecord,
  HabitRecord,
  TaskRecord,
  UserContextDTO,
} from "../models/userContextModel";
import { userContextRepository } from "../repositories/userContextRepository";
import { logger } from "../utils/logger";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_DAYS = 7;

class ContextBuilderService {
  async buildUserContext(
    userId: string,
    options?: BuildUserContextOptions,
  ): Promise<UserContextDTO> {
    const days = options?.days ?? DEFAULT_DAYS;

    if (!userId) {
      throw new Error("userId is required");
    }

    try {
      const [user, habits, tasks] = await Promise.all([
        userContextRepository.getUserById(userId),
        userContextRepository.getHabitsByUserId(userId),
        userContextRepository.getTasksByUserId(userId),
      ]);

      if (!user) {
        throw new Error("User not found");
      }

      const userTimezone = (user as any).timezone ?? "UTC";

      if (!user.allowNotification) {
        logger.warn("User has notifications disabled", { userId });
      }

      const now = dayjs().tz(userTimezone);

      const to = now.format("YYYY-MM-DD");
      const from = now.subtract(days - 1, "day").format("YYYY-MM-DD");

      const completions =
        await userContextRepository.getHabitCompletionsByUserId(
          userId,
          from,
          to,
        );

      const activeHabits = habits.filter(
        (habit) => habit.status === "active",
      );

      const habitSummary = this.buildHabitSummary(
        activeHabits,
        completions,
        days,
        userTimezone,
      );

      const taskSummary = this.buildTaskSummary(
        tasks,
        days,
        userTimezone,
      );

      const context: UserContextDTO = {
        userId,
        profile: {
          username: user.username,
          age: user.age ?? null,
          gender: user.gender ?? null,
          allowNotification: user.allowNotification ?? false,
          onboardingCompleted: user.onboarding?.completed ?? false,
          goals: user.onboarding?.goals ?? [],
          painPoints: user.onboarding?.painPoints ?? [],
          motivationType: user.onboarding?.motivationType ?? null,
          tonePreference: user.onboarding?.tonePreference ?? null,
          dailyCommitment: user.onboarding?.dailyCommitment ?? null,
          preferredTime: user.onboarding?.preferredTime ?? null,
          selfDisciplineLevel:
            user.onboarding?.selfDisciplineLevel ?? null,
          timezone: userTimezone,
        },
        habitStats: {
          activeHabitCount: activeHabits.length,
          completedDaysLastNDays: habitSummary.completedDays,
          expectedDaysLastNDays: habitSummary.expectedDays,
          missedDaysLastNDays: habitSummary.missedDays,
          completionRateLastNDays: habitSummary.completionRate,
          currentBestStreak: activeHabits.reduce(
            (max, habit) =>
              Math.max(max, habit.currentStreak ?? 0),
            0,
          ),
          longestBestStreak: activeHabits.reduce(
            (max, habit) =>
              Math.max(max, habit.longestStreak ?? 0),
            0,
          ),
          hasNoHabits: habitSummary.hasNoHabits,
        },
        taskStats: {
          totalTasks: tasks.length,
          completedTasks: taskSummary.completedTasks,
          dueTasksLastNDays: taskSummary.dueTasks,
          completedDueTasksLastNDays:
            taskSummary.completedDueTasks,
          missedTasksLastNDays: taskSummary.missedTasks,
          completionRateLastNDays: taskSummary.completionRate,
          completedToday: taskSummary.completedToday,
          pendingToday: taskSummary.pendingToday,
        },
        recentNDays: this.buildRecentActivity(
          days,
          activeHabits,
          completions,
          tasks,
          userTimezone,
        ),
        generatedAt: new Date().toISOString(),
        metadata: {
          daysConsidered: days,
          sourceCollections: [
            "users",
            "habits",
            "tasks",
            "habit_completions",
          ],
          generatedForTimezone: userTimezone,
        },
      };

      logger.info("User context built", {
        userId,
        days,
        habitCount: habits.length,
        taskCount: tasks.length,
      });

      return context;
    } catch (error: any) {
      logger.error("Context build failed", {
        userId,
        error: error?.message,
        stack: error?.stack,
      });
      throw error;
    }
  }

  private buildRecentActivity(
    days: number,
    habits: HabitRecord[],
    completions: HabitCompletionRecord[],
    tasks: TaskRecord[],
    timezone: string,
  ): DailyActivitySnapshot[] {
    const completionSet = new Set(
      completions
        .filter((item) => item.completed)
        .map((item) => `${item.habitId}:${item.date}`),
    );

    return Array.from({ length: days }, (_, index) => {
      const date = dayjs()
        .tz(timezone)
        .subtract(days - index - 1, "day")
        .format("YYYY-MM-DD");

      let habitExpected = 0;
      let habitCompleted = 0;

      for (const habit of habits) {
        if (this.isHabitExpectedOnDate(habit, date)) {
          habitExpected++;

          if (completionSet.has(`${habit.id}:${date}`)) {
            habitCompleted++;
          }
        }
      }

      const taskDue = tasks.filter((task) =>
        this.isTaskDueOnDate(task, date),
      ).length;

      const taskCompleted = tasks.filter((task) =>
        this.isTaskCompletedOnDate(task, date),
      ).length;

      return {
        date,
        habitCompleted,
        habitExpected,
        taskCompleted,
        taskDue,
      };
    });
  }

  private buildHabitSummary(
    habits: HabitRecord[],
    completions: HabitCompletionRecord[],
    days: number,
    timezone: string,
  ) {
    const recent = this.buildRecentActivity(
      days,
      habits,
      completions,
      [],
      timezone,
    );

    const expectedDays = recent.reduce(
      (sum, item) => sum + item.habitExpected,
      0,
    );
    const completedDays = recent.reduce(
      (sum, item) => sum + item.habitCompleted,
      0,
    );
    const missedDays = Math.max(0, expectedDays - completedDays);

    const hasNoHabits = habits.length === 0;

    return {
      expectedDays,
      completedDays,
      missedDays,
      completionRate: hasNoHabits
        ? 100
        : expectedDays === 0
        ? 0
        : Math.round((completedDays / expectedDays) * 100),
      hasNoHabits,
    };
  }

  private buildTaskSummary(
    tasks: TaskRecord[],
    days: number,
    timezone: string,
  ) {
    const dates = Array.from({ length: days }, (_, index) =>
      dayjs()
        .tz(timezone)
        .subtract(days - index - 1, "day")
        .format("YYYY-MM-DD"),
    );

    const dueTasks = tasks.filter((task) => {
      const endDate = this.toDateKey(task.endTime);
      return Boolean(endDate && dates.includes(endDate));
    });

    const completedTasks = tasks.filter(
      (task) => task.isCompleted,
    ).length;

    const completedDueTasks = dueTasks.filter(
      (task) => task.isCompleted,
    ).length;

    const missedTasks = dueTasks.filter(
      (task) => !task.isCompleted,
    ).length;

    const today = dayjs().tz(timezone).format("YYYY-MM-DD");

    return {
      totalTasks: tasks.length,
      completedTasks,
      dueTasks: dueTasks.length,
      completedDueTasks,
      missedTasks,
      completionRate:
        dueTasks.length === 0
          ? 0
          : Math.round(
              (completedDueTasks / dueTasks.length) * 100,
            ),
      completedToday: tasks.filter((task) =>
        this.isTaskCompletedOnDate(task, today),
      ).length,
      pendingToday: tasks.filter(
        (task) =>
          this.isTaskDueOnDate(task, today) &&
          !task.isCompleted,
      ).length,
    };
  }

  private isHabitExpectedOnDate(
    habit: HabitRecord,
    date: string,
  ): boolean {
    if (!habit.schedule?.type) {
      return false;
    }

    const scheduleStart = habit.schedule.startDate
      ? dayjs(habit.schedule.startDate).format("YYYY-MM-DD")
      : null;

    if (scheduleStart && date < scheduleStart) {
      return false;
    }

    if (habit.schedule.type === "weekly") {
      const dayOfWeek = dayjs(date).day();
      return (
        Array.isArray(habit.schedule.days) &&
        habit.schedule.days.includes(dayOfWeek)
      );
    }

    if (habit.schedule.type === "fixed") {
      return (
        Array.isArray(habit.schedule.dates) &&
        habit.schedule.dates.includes(date)
      );
    }

    if (habit.schedule.type === "interval") {
      if (!habit.schedule.startDate || !habit.schedule.everyNDays) {
        return false;
      }

      const diff = dayjs(date)
        .startOf("day")
        .diff(
          dayjs(habit.schedule.startDate).startOf("day"),
          "day",
        );

      return diff >= 0 && diff % habit.schedule.everyNDays === 0;
    }

    return false;
  }

  private isTaskDueOnDate(task: TaskRecord, date: string): boolean {
    return this.toDateKey(task.endTime) === date;
  }

  private isTaskCompletedOnDate(
    task: TaskRecord,
    date: string,
  ): boolean {
    return this.toDateKey(task.completedAt) === date;
  }

  private toDateKey(value: unknown): string | null {
    if (!value) return null;

    if (value instanceof Date) {
      return dayjs(value).format("YYYY-MM-DD");
    }

    if (typeof value === "string") {
      const parsed = dayjs(value);
      return parsed.isValid()
        ? parsed.format("YYYY-MM-DD")
        : null;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value
    ) {
      const maybeTimestamp = value as {
        toDate: () => Date;
      };
      return dayjs(maybeTimestamp.toDate()).format(
        "YYYY-MM-DD",
      );
    }

    return null;
  }
}

export const contextBuilderService = new ContextBuilderService();