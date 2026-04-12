import { firestore } from "../services/firebaseAdmin";

const HABITS_COLLECTION = "habits";
const TASKS_COLLECTION = "tasks";

export interface ChatUserStats {
  currentBestStreak: number;
  hasNoHabits: boolean;
  pendingToday: number;
  completedToday: number;
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "toDate" in (value as any)) {
    return (value as any).toDate().toISOString().slice(0, 10);
  }
  return null;
}

export const chatStatsRepository = {
  async getUserStats(userId: string): Promise<ChatUserStats> {
    const today = new Date().toISOString().slice(0, 10);

    const [habitsSnap, tasksSnap] = await Promise.all([
      firestore.collection(HABITS_COLLECTION).where("userId", "==", userId).get(),
      firestore.collection(TASKS_COLLECTION).where("userId", "==", userId).get(),
    ]);

    const activeHabits = habitsSnap.docs
      .map((d) => d.data())
      .filter((h) => h.status === "active");

    const hasNoHabits = activeHabits.length === 0;

    const currentBestStreak = activeHabits.reduce(
      (max, h) => Math.max(max, h.currentStreak ?? 0),
      0,
    );

    const tasks = tasksSnap.docs.map((d) => d.data());

    const pendingToday = tasks.filter(
      (t) => !t.isCompleted && toDateString(t.endTime) === today,
    ).length;

    const completedToday = tasks.filter(
      (t) => t.isCompleted && toDateString(t.completedAt) === today,
    ).length;

    return { currentBestStreak, hasNoHabits, pendingToday, completedToday };
  },
};
