import { firestore } from "../services/firebaseAdmin";
import { CalendarTask } from "../models/taskModel";

const TASKS_COLLECTION = "tasks";

const toIso = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
};

const overlaps = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) => {
  return leftStart < rightEnd && rightStart < leftEnd;
};

export const taskRepository = {
  async getTasksByDateRange(
    userId: string,
    from: string,
    to: string,
  ): Promise<CalendarTask[]> {
    const snapshot = await firestore
      .collection(TASKS_COLLECTION)
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .where("isCompleted", "==", false)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const startTime = toIso(data.startTime);
        const endTime = toIso(data.endTime);

        if (!startTime || !endTime) {
          return null;
        }

        if (!overlaps(startTime, endTime, from, to)) {
          return null;
        }

        return {
          taskId: doc.id,
          userId,
          title: typeof data.title === "string" ? data.title : "",
          startTime,
          endTime,
        };
      })
      .filter((task): task is CalendarTask => task !== null);
  },
};
