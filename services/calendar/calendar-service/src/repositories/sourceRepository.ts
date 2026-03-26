import { firestore } from "../services/firebaseAdmin";
import { Habit } from "../models/habitModel";

const TASKS_COLLECTION = "tasks";
const HABITS_COLLECTION = "habits";

export const sourceRepository = {
  async deleteTask(taskId: string) {
    await firestore.collection(TASKS_COLLECTION).doc(taskId).delete();
  },

  async getActiveHabits(): Promise<Habit[]> {
    const snapshot = await firestore
      .collection(HABITS_COLLECTION)
      .where("status", "==", "active")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Habit);
  },

  async getActiveHabitsByUser(userId: string): Promise<Habit[]> {
    const snapshot = await firestore
      .collection(HABITS_COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    return snapshot.docs.map((doc) => doc.data() as Habit);
  },
};
