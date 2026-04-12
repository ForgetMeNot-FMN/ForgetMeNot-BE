import { UserRecord } from "../models/userContextModel";
import { ChatUserStats } from "../repositories/chatStatsRepository";

/**
 * Always-on: lightweight onboarding profile
 * Injected regardless of personalizedContext preference.
 */
export function buildOnboardingSummary(user: UserRecord): string {
  const lines: string[] = [];
  const o = user.onboarding;

  if (user.username) lines.push(`User's name: ${user.username}.`);
  if (o?.goals && o.goals.length > 0) lines.push(`Their goals: ${o.goals.join(", ")}.`);
  if (o?.painPoints && o.painPoints.length > 0) lines.push(`Pain points: ${o.painPoints.join(", ")}.`);
  if (o?.motivationType) lines.push(`Motivation style: ${o.motivationType}.`);
  if (o?.selfDisciplineLevel != null) lines.push(`Self-discipline level: ${o.selfDisciplineLevel}/10.`);
  if (o?.dailyCommitment) lines.push(`Daily time commitment: ${o.dailyCommitment} minutes.`);
  if (o?.preferredTime) lines.push(`Preferred time of day: ${o.preferredTime}.`);

  return lines.join(" ");
}

/**
 * Optional: habit/task stats
 * Injected only when personalizedContext preference is true.
 */
export function buildStatsSummary(stats: ChatUserStats): string {
  const lines: string[] = [];

  if (!stats.hasNoHabits) {
    lines.push(`Current best habit streak: ${stats.currentBestStreak} days.`);
  } else {
    lines.push("The user hasn't set up any habits yet.");
  }

  if (stats.completedToday > 0) {
    lines.push(`Tasks completed today: ${stats.completedToday}.`);
  }

  if (stats.pendingToday > 0) {
    lines.push(`Tasks still pending today: ${stats.pendingToday}.`);
  }

  return lines.join(" ");
}
