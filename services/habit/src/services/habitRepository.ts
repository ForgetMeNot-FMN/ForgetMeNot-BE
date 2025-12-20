import { firestore } from "./firebaseAdmin";
import { Habit } from "../models/habitModel";
import { logger } from "../utils/logger";

const HABITS_COLLECTION = "habits";

export const habitRepository = {
  async create(habit: Habit) {
    await firestore.collection(HABITS_COLLECTION).doc(habit.id).set(habit);
    return habit;
  },

  async findById(id: string, userId: string): Promise<Habit | null> {
    const snap = await firestore.collection(HABITS_COLLECTION).doc(id).get();

    if (!snap.exists) return null;

    const habit = snap.data() as Habit;

    if (habit.userId !== userId) {
      throw new Error("Forbidden");
    }

    return habit;
  },

  async update(id: string, data: Partial<Habit>) {
    await firestore
      .collection(HABITS_COLLECTION)
      .doc(id)
      .update({
        ...data,
        updatedAt: new Date(),
      });
  },

  async findActiveByUser(userId: string) {
    const snap = await firestore
      .collection(HABITS_COLLECTION)
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    return snap.docs.map((d) => d.data() as Habit);
  },

  async delete(userId: string, id: string) {
    const snap = await firestore
      .collection(HABITS_COLLECTION)
      .where("id", "==", id)
      .get();

    if (snap.empty) {
      throw new Error("Habit not found");
    }
    if (snap.docs[0].data().userId !== userId) {
      throw new Error("Forbidden");
    }
    const habit = snap.docs[0].data() as Habit;
    logger.info("Deleting habit", { userId, habitId: id, deletedHabit: habit });
    await firestore.collection(HABITS_COLLECTION).doc(snap.docs[0].id).delete();
    return habit;
  },
};
