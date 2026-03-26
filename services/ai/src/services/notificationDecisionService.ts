import { UserContextDTO } from "../models/userContextModel";
import {
  NotificationDecisionResult,
} from "../models/decisionModel";

class NotificationDecisionService {
  decide(context: UserContextDTO): NotificationDecisionResult {
    const { habitStats, taskStats, recentNDays, profile } = context;

    const habitRate = habitStats.completionRateLastNDays;
    const taskRate = taskStats.completionRateLastNDays;
    const avgRate = (habitRate + taskRate) / 2;

    const missedDays = habitStats.missedDaysLastNDays;
    const streak = habitStats.currentBestStreak;

    const today = recentNDays[recentNDays.length - 1] ?? {
        habitCompleted: 0,
        taskCompleted: 0,
        habitExpected: 0,
        taskDue: 0,
    };

    const hasAnyPlannedToday =
        today.habitExpected > 0 || today.taskDue > 0;

    const didNothingToday =
        hasAnyPlannedToday &&
        today.habitCompleted === 0 &&
        today.taskCompleted === 0;

    const madeProgressToday =
        today.habitCompleted > 0 || today.taskCompleted > 0;

    const totalCompletedToday = today.habitCompleted + today.taskCompleted;

    const madeStrongProgressToday = totalCompletedToday >= 2;

    const isHighPerformer = avgRate >= 80;
    const isStruggling = avgRate < 50 && avgRate >= 30;

    const habitRateLow = habitRate < 40;
    const taskRateLow = taskRate < 40;

    const focusArea =
        habitRateLow && taskRateLow
            ? "both_low"
            : habitRateLow
            ? "habit"
            : taskRateLow
            ? "task"
            : "balanced";

    let type: "WARNING" | "ENCOURAGEMENT" | "CELEBRATION" =
      "ENCOURAGEMENT";

    let trigger = "";
    let intensity: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    const hadRecentActivity =
        (recentNDays ?? []).slice(-3).some(
            (day) => day.habitCompleted > 0 || day.taskCompleted > 0);

    const streakDropped =
        streak === 0 &&
        habitStats.longestBestStreak >= 5 &&
        hadRecentActivity;

    // Streak Break
    if (streakDropped) {
        type = "WARNING";
        trigger = "streak_break";
        intensity = "HIGH";
    }

    // Hard Warning
    else if (avgRate < 30 || missedDays >= 5) {
      type = "WARNING";
      trigger = "severe_drop";
      intensity = "HIGH";
    }

    // Soft Warning for Today
    else if (didNothingToday) {
        type = "WARNING";
        trigger = "no_activity_today";
        intensity = "MEDIUM";
    }

    // Soft Warning for Low Engagement
    else if (isStruggling) {
        type = "WARNING";
        trigger = "low_engagement";
        intensity = "MEDIUM";
    }

    // High Streak Celebration
    else if (streak >= 7 && madeProgressToday) {
        type = "CELEBRATION";
        trigger = "high_streak";
        intensity = "HIGH";
    }

    // High Performance Celebration
    else if (isHighPerformer && (madeProgressToday || !hasAnyPlannedToday)) {
        type = "CELEBRATION";
        trigger = "high_performance";
        intensity = "MEDIUM";
    }

    // Celebration for Strong Daily Progress
    else if (madeStrongProgressToday) {
        type = "CELEBRATION";
        trigger = "strong_daily_progress";
        intensity = "MEDIUM";
    }

    // Small Celebration for Daily Progress
    else if (madeProgressToday) {
        type = "CELEBRATION";
        trigger = "daily_progress";
        intensity = "LOW";
    }

    // Default Encouragement
    else {
      type = "ENCOURAGEMENT";
      trigger = "steady_state";
      intensity = "LOW";
    }

    return {
      type,
      reason: JSON.stringify({
        trigger,
        intensity,
        avgRate,
        habitRate,
        taskRate,
        streak,
        missedDays,
        focusArea,
        hasAnyPlannedToday,
        hadRecentActivity,
        today: {
          habitCompleted: today.habitCompleted,
          taskCompleted: today.taskCompleted,
        },
        motivationType: profile.motivationType,
      }),
    };
  }
}

export const notificationDecisionService = new NotificationDecisionService();