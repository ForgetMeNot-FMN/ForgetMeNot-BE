import {
  DailyActivitySnapshot,
  UserContextDTO,
} from "../models/userContextModel";
import { GeneratedPrompt, NotificationType } from "../models/llmModels";

export function generatePrompt(
  userContext: UserContextDTO,
  _weeklyData: DailyActivitySnapshot[],
  notificationType: NotificationType,
): GeneratedPrompt {
  const { profile, habitStats, taskStats, notificationFeedback } = userContext;

  const goals =
    profile.goals.length > 0
      ? profile.goals.join(", ")
      : "general self-improvement";

  const motivationType = profile.motivationType ?? "balanced";
  const tonePreference = profile.tonePreference ?? "neutral";
  const disciplineLevel = profile.selfDisciplineLevel ?? 3;

  const completedHabits = habitStats.completedDaysLastNDays;
  const missedHabits = habitStats.missedDaysLastNDays;
  const completedTasks = taskStats.completedDueTasksLastNDays;
  const streak = habitStats.currentBestStreak;

  const toneInstruction = deriveToneInstruction(notificationType);
  const streakLine = buildStreakLine(streak);
  const historySection = buildHistorySection(notificationFeedback.userPromptNotes);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    goals,
    motivationType,
    tonePreference,
    disciplineLevel,
    completedHabits,
    missedHabits,
    completedTasks,
    streakLine,
    toneInstruction,
    historySection,
  });

  return { systemPrompt, userPrompt };
}


function deriveToneInstruction(notificationType: NotificationType): string {
  switch (notificationType) {
    case "REMINDER":
      return "neutral and slightly encouraging — do not pressure the user";
    case "PROGRESS":
      return "positive and rewarding — acknowledge what the user has already done";
    case "MOTIVATION":
      return "emotional and encouraging — one emoji at the end is allowed if it feels natural";
    case "SYSTEM":
      return "neutral and informational — keep it factual and brief";
  }
}

function buildStreakLine(streak: number): string {
  if (streak >= 7) return `Current streak: ${streak} days (impressive — you may mention it)`;
  if (streak > 0) return `Current streak: ${streak} days`;
  return "No active streak";
}

function buildHistorySection(notes: string[]): string {
  if (notes.length === 0) return "";
  return "\nHistory signals:\n" + notes.map((n) => `- ${n}`).join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You are a push notification writer for a personal productivity app called Forget Me Not.",
    "Your only job is to write one short, human push notification for a real user based on their goals and recent activity.",
    "",
    "Output rules — no exceptions:",
    '- Return ONLY valid JSON in this exact shape: {"title": "string", "body": "string", "tone": "string"}',
    '- tone must be exactly one of these four values: "neutral", "positive", "encouraging", "emotional"',
    "- title: 3 to 6 words, plain text, no punctuation at the end",
    "- body: 1 to 2 sentences, no longer",
    "- No markdown, no asterisks, no bullet points, no headers",
    "- No emojis unless the tone instruction explicitly permits them",
    "- Write like a supportive friend, not a corporate bot",
    "- Do NOT explain your reasoning",
    "- Do NOT invent numbers, streaks, or facts that were not given to you",
    "- If the context feels thin or ambiguous, write a warm generic message rather than guessing",
  ].join("\n");
}

function buildUserPrompt(params: {
  goals: string;
  motivationType: string;
  tonePreference: string;
  disciplineLevel: number;
  completedHabits: number;
  missedHabits: number;
  completedTasks: number;
  streakLine: string;
  toneInstruction: string;
  historySection: string;
}): string {
  return [
    "User profile:",
    `- Goals: ${params.goals}`,
    `- Motivation style: ${params.motivationType}`,
    `- Preferred tone: ${params.tonePreference}`,
    `- Self-discipline level: ${params.disciplineLevel} out of 5`,
    "",
    "Activity over the last 7 days:",
    `- Habits completed: ${params.completedHabits}`,
    `- Habits missed: ${params.missedHabits}`,
    `- Tasks completed: ${params.completedTasks}`,
    `- ${params.streakLine}`,
    params.historySection,
    "",
    `Tone for this message: ${params.toneInstruction}`,
    "",
    'Respond with ONLY this JSON and nothing else:\n{"title": "...", "body": "...", "tone": "..."}',
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
