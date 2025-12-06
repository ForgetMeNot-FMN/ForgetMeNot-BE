import { firestore } from "./firebaseAdmin";
import { Garden } from "../models/gardenModel";

const GARDENS_COLLECTION = "gardens";

export const gardenRepository = {
  async getByUserId(userId: string): Promise<Garden | null> {
    const doc = await firestore.collection(GARDENS_COLLECTION).doc(userId).get();
    return doc.exists ? (doc.data() as Garden) : null;
  },

  async createDefault(userId: string): Promise<Garden> {
    const garden: Garden = {
      user_id: userId,
      coins: 20,
      water: 10,
      streak: 0,
      total_flowers: 0,
      total_watered_count: 0,
      updated_at: new Date(),
    };

    await firestore.collection(GARDENS_COLLECTION).doc(userId).set(garden);
    return garden;
  },

  async update(userId: string, data: Partial<Garden>) {
    await firestore.collection(GARDENS_COLLECTION).doc(userId).update({
      ...data,
      updated_at: new Date(),
    });
  },

  async delete(userId: string) {
    await firestore.collection(GARDENS_COLLECTION).doc(userId).delete();
  },
};
