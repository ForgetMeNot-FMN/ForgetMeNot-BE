import { firestore } from "./firebaseAdmin";
import { Habit } from "../models/habitModel";
import { logger } from "../utils/logger";
import dayjs from "dayjs";
import { gardenRepository } from "../repository/gardenRepository";

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

  async completeHabitWithReward(
    userId: string,
    habitId: string,
    rewardCoins: number,
    rewardWater: number,
  ) {
    const today = dayjs().format("YYYY-MM-DD");
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

    return firestore.runTransaction(async (tx) => {
      const habitRef = firestore.collection(HABITS_COLLECTION).doc(habitId);
      const todayCompletionRef = firestore
        .collection("habit_completions")
        .doc(`${habitId}_${today}`);
      const yesterdayCompletionRef = firestore
        .collection("habit_completions")
        .doc(`${habitId}_${yesterday}`);

      const habitSnap = await tx.get(habitRef);
      if (!habitSnap.exists) throw new Error("Habit not found");

      const habit = habitSnap.data() as Habit;
      if (habit.userId !== userId) throw new Error("Forbidden");

      const todayCompletionSnap = await tx.get(todayCompletionRef);
      if (todayCompletionSnap.exists) {
        return {
          habitId,
          currentStreak: habit.currentStreak,
          rewarded: { coins: 0, water: 0 },
          alreadyCompleted: true,
        };
      }

      const yesterdayCompletionSnap = await tx.get(yesterdayCompletionRef);
      const newStreak = yesterdayCompletionSnap.exists
        ? habit.currentStreak + 1
        : 1;

      await gardenRepository.rewardUserInTransaction(
        tx,
        userId,
        rewardCoins,
        rewardWater,
      );

      tx.set(todayCompletionRef, {
        habitId,
        userId,
        date: today,
        completed: true,
        rewardGranted: true,
        coins: rewardCoins,
        water: rewardWater,
        createdAt: new Date(),
      });

      tx.update(habitRef, {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
        updatedAt: new Date(),
      });

      return {
        habitId,
        currentStreak: newStreak,
        rewarded: { coins: rewardCoins, water: rewardWater },
        alreadyCompleted: false,
      };
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
