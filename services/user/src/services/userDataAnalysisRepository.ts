import { firestore } from "./firebaseAdmin";
import {
  AnalysisAwardRecord,
  AnalysisHabitCompletionRecord,
  AnalysisTaskRecord,
  FlowerSnapshot,
  GardenBalance,
} from "../models/userDataAnalysisModel";
import { logger } from "../utils/logger";

const TASKS_COLLECTION = "tasks";
const HABIT_COMPLETIONS_COLLECTION = "habit_completions";
const AWARDS_COLLECTION = "awards";
const GARDENS_COLLECTION = "gardens";

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export const userDataAnalysisRepository = {
  async getCompletedTasksBetween(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<AnalysisTaskRecord[]> {
    const snapshot = await firestore
      .collection(TASKS_COLLECTION)
      .where("userId", "==", userId)
      .where("isCompleted", "==", true)
      .where("completedAt", ">=", start)
      .where("completedAt", "<=", end)
      .get();

    logger.info("Completed tasks fetched for analysis", { userId, count: snapshot.size });

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        taskId: doc.id,
        completedAt: toDate(data.completedAt),
        rewardGranted: data.rewardGranted,
      };
    });
  },

  async getHabitCompletionsBetween(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<AnalysisHabitCompletionRecord[]> {
    const snapshot = await firestore
      .collection(HABIT_COMPLETIONS_COLLECTION)
      .where("userId", "==", userId)
      .where("completed", "==", true)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get();

    logger.info("Habit completions fetched for analysis", { userId, count: snapshot.size, startDate, endDate });

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        habitId: String(data.habitId ?? ""),
        date: String(data.date ?? ""),
        coins: Number(data.coins ?? 0),
        water: Number(data.water ?? 0),
      };
    });
  },

  async getAwardsBetween(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<AnalysisAwardRecord[]> {
    const snapshot = await firestore
      .collection(AWARDS_COLLECTION)
      .where("userId", "==", userId)
      .where("unlockedAt", ">=", start)
      .where("unlockedAt", "<=", end)
      .get();

    logger.info("Awards fetched for analysis", { userId, count: snapshot.size });

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        awardId: doc.id,
        awardType: String(data.awardType ?? "unknown"),
        unlockedAt: toDate(data.unlockedAt),
      };
    });
  },

  async getGardenBalance(userId: string): Promise<GardenBalance> {
    const doc = await firestore.collection(GARDENS_COLLECTION).doc(userId).get();
    const data = doc.exists ? doc.data() : null;

    logger.info("Garden balance fetched for analysis", { userId, exists: doc.exists });

    return {
      coins: Number(data?.coins ?? 0),
      water: Number(data?.water ?? 0),
    };
  },

  async getFlowerSnapshot(userId: string): Promise<FlowerSnapshot> {
    const snapshot = await firestore
      .collection(GARDENS_COLLECTION)
      .doc(userId)
      .collection("flowers")
      .get();

    logger.info("Flowers fetched for analysis snapshot", { userId, count: snapshot.size });

    let grownFlowers = 0;
    let deadFlowers = 0;
    let aliveFlowers = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.growthStage === "bloom") grownFlowers += 1;
      if (data.isAlive === false) {
        deadFlowers += 1;
      } else {
        aliveFlowers += 1;
      }
    });

    return {
      purchasedSeeds: snapshot.size,
      grownFlowers,
      deadFlowers,
      aliveFlowers,
    };
  },
};
