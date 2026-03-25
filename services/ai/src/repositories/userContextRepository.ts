import { firestore } from "../services/firebaseAdmin";
import {
  HabitCompletionRecord,
  HabitRecord,
  TaskRecord,
  UserRecord,
} from "../models/userContextModel";

const USERS_COLLECTION = "users";
const HABITS_COLLECTION = "habits";
const TASKS_COLLECTION = "tasks";
const HABIT_COMPLETIONS_COLLECTION = "habit_completions";

export const userContextRepository = {
  async getUserById(userId: string): Promise<UserRecord | null> {
    const doc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
    return doc.exists ? ({ userId: doc.id, ...doc.data() } as UserRecord) : null;
  },

  async getHabitsByUserId(userId: string): Promise<HabitRecord[]> {
    const snap = await firestore
      .collection(HABITS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as HabitRecord));
  },

  async getTasksByUserId(userId: string): Promise<TaskRecord[]> {
    const snap = await firestore
      .collection(TASKS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snap.docs.map((doc) => ({ taskId: doc.id, ...doc.data() } as TaskRecord));
  },

  async getHabitCompletionsByUserId(
    userId: string,
    from: string,
    to: string,
  ): Promise<HabitCompletionRecord[]> {
    const snap = await firestore
      .collection(HABIT_COMPLETIONS_COLLECTION)
      .where("userId", "==", userId)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as HabitCompletionRecord));
  },
};
