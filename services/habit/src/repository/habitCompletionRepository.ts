import { firestore } from "../services/firebaseAdmin";
import dayjs from "dayjs";

const COLLECTION = "habit_completions";

export const habitCompletionRepository = {
  async getByHabitAndDate(habitId: string, userId: string, date: string) {
    const snap = await firestore
      .collection(COLLECTION)
      .where("habitId", "==", habitId)
      .where("userId", "==", userId)
      .where("date", "==", date)
      .limit(1)
      .get();

    return snap.empty ? null : snap.docs[0];
  },

  async create(data: {
    habitId: string;
    userId: string;
    date: string;
    completed: boolean;
    rewardGranted: boolean;
    coins: number;
    water: number;
  }) {
    const id = `${data.habitId}_${data.date}`;

    await firestore
      .collection(COLLECTION)
      .doc(id)
      .set({
        ...data,
        createdAt: new Date(),
      });
  },

  async isCompletedToday(habitId: string) {
    const today = dayjs().format("YYYY-MM-DD");
    const snap = await firestore
      .collection(COLLECTION)
      .doc(`${habitId}_${today}`)
      .get();

    return snap.exists && snap.data()?.completed === true;
  },

  async findBetweenDates(
    habitId: string,
    userId: string,
    from: string,
    to: string
  ) {
    const snap = await firestore
      .collection(COLLECTION)
      .where("habitId", "==", habitId)
      .where("userId", "==", userId)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    return snap.docs.map((d) => d.data());
  },
};
