import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import {
  BuildUserContextOptions,
  DailyActivitySnapshot,
  HabitCompletionRecord,
  HabitRecord,
  NotificationRecord,
  NotificationLogRecord,
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

      const [completions, notificationLogs, notifications] = await Promise.all([
        userContextRepository.getHabitCompletionsByUserId(
          userId,
          from,
          to,
        ),
        userContextRepository.getNotificationLogsByUserId(userId),
        userContextRepository.getRecentNotificationsByUserId(userId),
      ]);

      const effectiveNotificationLogs =
        await this.backfillIgnoredNotifications({
          userId,
          timezone: userTimezone,
          notifications,
          notificationLogs,
          habits,
          tasks,
          completions,
        });

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
          username: user.username ?? null,
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
        notificationFeedback: this.buildNotificationFeedbackSummary(
          effectiveNotificationLogs,
        ),
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
            "notifications",
            "notification_logs",
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

  private buildNotificationFeedbackSummary(
    logs: NotificationLogRecord[],
  ) {
    const recentLogs = logs.slice(0, 5);
    const llmLogs = logs.filter(
      (log) => log.generation_source === "LLM",
    );
    const systemLogs = logs.filter(
      (log) => log.generation_source === "SYSTEM",
    );
    const llmGeneratedCount = logs.filter(
      (log) => log.generation_source === "LLM",
    ).length;
    const systemGeneratedCount = logs.filter(
      (log) => log.generation_source === "SYSTEM",
    ).length;
    const unknownGeneratedCount = logs.filter(
      (log) =>
        !log.generation_source ||
        log.generation_source === "UNKNOWN",
    ).length;

    const clicks = logs.filter((log) => log.was_clicked).length;
    const completions = logs.filter(
      (log) => log.was_completed,
    ).length;
    const ignores = logs.filter((log) => log.was_ignored).length;

    const userPromptNotes: string[] = [];

    if (logs.length === 0) {
      userPromptNotes.push(
        "No notification feedback history yet; keep messaging broadly helpful and non-repetitive.",
      );
    }

    if (completions > 0) {
      userPromptNotes.push(
        "This user has completed actions after notifications before, so actionable reminders can work well.",
      );
    }

    const llmIgnores = llmLogs.filter((log) => log.was_ignored).length;
    const systemIgnores = systemLogs.filter(
      (log) => log.was_ignored,
    ).length;
    const systemCompletions = systemLogs.filter(
      (log) => log.was_completed,
    ).length;

    if (llmIgnores >= 2) {
      userPromptNotes.push(
        "Prior LLM-generated notifications were often ignored; avoid repeating similar wording or tone.",
      );
    }

    if (llmGeneratedCount > 0) {
      userPromptNotes.push(
        "Use LLM notification history as the main personalization signal; do not reuse stale phrasing from prior model-generated messages.",
      );
    }

    if (systemGeneratedCount > 0 && systemCompletions > 0) {
      userPromptNotes.push(
        "Fixed system notifications have worked before; preserve their clarity when generating new copy.",
      );
    }

    if (systemGeneratedCount > 0 && systemIgnores >= 2) {
      userPromptNotes.push(
        "Fixed system notifications are frequently ignored; a more adaptive LLM phrasing may perform better.",
      );
    }

    return {
      totalTracked: logs.length,
      llmGeneratedCount,
      systemGeneratedCount,
      unknownGeneratedCount,
      clicks,
      completions,
      ignores,
      lastInteractionAt: logs[0]?.last_feedback_at ?? null,
      recentLogs,
      userPromptNotes,
    };
  }

  private async backfillIgnoredNotifications(params: {
    userId: string;
    timezone: string;
    notifications: NotificationRecord[];
    notificationLogs: NotificationLogRecord[];
    habits: HabitRecord[];
    tasks: TaskRecord[];
    completions: HabitCompletionRecord[];
  }): Promise<NotificationLogRecord[]> {
    const logsByNotificationId = new Map(
      params.notificationLogs.map((log) => [log.notification_id, log]),
    );

    for (const notification of params.notifications) {
      if (!notification.notificationId) continue;
      if (!notification.sentAt) continue;
      if (
        notification.sourceType !== "TASK" &&
        notification.sourceType !== "HABIT" &&
        notification.sourceType !== "SYSTEM"
      ) {
        continue;
      }

      const existingLog = logsByNotificationId.get(
        notification.notificationId,
      );

      if (
        existingLog?.was_completed ||
        existingLog?.was_ignored
      ) {
        continue;
      }

      if (notification.sourceType === "TASK") {
        const task = params.tasks.find(
          (item) => item.taskId === notification.sourceId,
        );

        if (!task || task.isCompleted) {
          continue;
        }

        const endDate = this.toDayjs(task.endTime);
        if (!endDate) {
          continue;
        }

        if (!endDate.isBefore(dayjs())) {
          continue;
        }

        await userContextRepository.upsertIgnoredNotificationLog({
          notificationId: notification.notificationId,
          userId: params.userId,
          sourceType: "TASK",
          sourceId: notification.sourceId ?? "",
          generationSource:
            existingLog?.generation_source ?? "SYSTEM",
        });

        logsByNotificationId.set(notification.notificationId, {
          id: notification.notificationId,
          notification_id: notification.notificationId,
          user_id: params.userId,
          source_type: "TASK",
          source_id: notification.sourceId,
          generation_source:
            existingLog?.generation_source ?? "SYSTEM",
          was_clicked: existingLog?.was_clicked ?? false,
          clicked_at: existingLog?.clicked_at,
          was_completed: existingLog?.was_completed ?? false,
          completed_at: existingLog?.completed_at,
          was_ignored: true,
          ignored_at: new Date().toISOString(),
          last_feedback_event: "IGNORED",
          last_feedback_at: new Date().toISOString(),
          created_at:
            existingLog?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (notification.sourceType === "HABIT") {
        const sentDay = this.toDateKey(notification.sentAt);
        if (!sentDay) {
          continue;
        }

        const habitCompletedOnSentDay = params.completions.some(
          (completion) =>
            completion.habitId === notification.sourceId &&
            completion.date === sentDay &&
            completion.completed,
        );

        if (habitCompletedOnSentDay) {
          continue;
        }

        const endOfSentDay = dayjs
          .tz(sentDay, params.timezone)
          .endOf("day");

        if (!endOfSentDay.isBefore(dayjs().tz(params.timezone))) {
          continue;
        }

        await userContextRepository.upsertIgnoredNotificationLog({
          notificationId: notification.notificationId,
          userId: params.userId,
          sourceType: "HABIT",
          sourceId: notification.sourceId ?? "",
          generationSource:
            existingLog?.generation_source ?? "SYSTEM",
        });

        logsByNotificationId.set(notification.notificationId, {
          id: notification.notificationId,
          notification_id: notification.notificationId,
          user_id: params.userId,
          source_type: "HABIT",
          source_id: notification.sourceId,
          generation_source:
            existingLog?.generation_source ?? "SYSTEM",
          was_clicked: existingLog?.was_clicked ?? false,
          clicked_at: existingLog?.clicked_at,
          was_completed: existingLog?.was_completed ?? false,
          completed_at: existingLog?.completed_at,
          was_ignored: true,
          ignored_at: new Date().toISOString(),
          last_feedback_event: "IGNORED",
          last_feedback_at: new Date().toISOString(),
          created_at:
            existingLog?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (
        notification.sourceType === "SYSTEM" &&
        notification.sourceId?.startsWith(`STREAK_${params.userId}_`) &&
        (existingLog?.generation_source ?? "UNKNOWN") === "LLM"
      ) {
        const streakDate = notification.sourceId.split("_").pop();
        const hasRecoveryCompletion = Boolean(
          streakDate &&
            params.completions.some(
              (completion) =>
                completion.userId === params.userId &&
                completion.date === streakDate &&
                completion.completed,
            ),
        );

        if (hasRecoveryCompletion) {
          await userContextRepository.upsertCompletedNotificationLog({
            notificationId: notification.notificationId,
            userId: params.userId,
            sourceType: "HABIT",
            sourceId: notification.sourceId,
            generationSource: "LLM",
          });

          logsByNotificationId.set(notification.notificationId, {
            id: notification.notificationId,
            notification_id: notification.notificationId,
            user_id: params.userId,
            source_type: "HABIT",
            source_id: notification.sourceId,
            generation_source: "LLM",
            was_clicked: existingLog?.was_clicked ?? false,
            clicked_at: existingLog?.clicked_at,
            was_completed: true,
            completed_at: new Date().toISOString(),
            was_ignored: false,
            ignored_at: existingLog?.ignored_at,
            last_feedback_event: "COMPLETED",
            last_feedback_at: new Date().toISOString(),
            created_at:
              existingLog?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          continue;
        }

        const currentBestStreak = params.habits.reduce(
          (max, habit) => Math.max(max, habit.currentStreak ?? 0),
          0,
        );

        if (currentBestStreak > 0) {
          continue;
        }

        await userContextRepository.upsertIgnoredNotificationLog({
          notificationId: notification.notificationId,
          userId: params.userId,
          sourceType: "HABIT",
          sourceId: notification.sourceId,
          generationSource: "LLM",
        });

        logsByNotificationId.set(notification.notificationId, {
          id: notification.notificationId,
          notification_id: notification.notificationId,
          user_id: params.userId,
          source_type: "HABIT",
          source_id: notification.sourceId,
          generation_source: "LLM",
          was_clicked: existingLog?.was_clicked ?? false,
          clicked_at: existingLog?.clicked_at,
          was_completed: existingLog?.was_completed ?? false,
          completed_at: existingLog?.completed_at,
          was_ignored: true,
          ignored_at: new Date().toISOString(),
          last_feedback_event: "IGNORED",
          last_feedback_at: new Date().toISOString(),
          created_at:
            existingLog?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return Array.from(logsByNotificationId.values()).sort((a, b) => {
      const aTs = a.last_feedback_at ?? "";
      const bTs = b.last_feedback_at ?? "";
      return bTs.localeCompare(aTs);
    });
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

  private toDayjs(value: unknown) {
    if (!value) return null;

    if (value instanceof Date) {
      return dayjs(value);
    }

    if (typeof value === "string") {
      const parsed = dayjs(value);
      return parsed.isValid() ? parsed : null;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value
    ) {
      const maybeTimestamp = value as {
        toDate: () => Date;
      };
      return dayjs(maybeTimestamp.toDate());
    }

    return null;
  }
}

export const contextBuilderService = new ContextBuilderService();
