import { firestore } from "../services/firebaseAdmin";
import { Award } from "../models/awardsModel";

const AWARDS_COLLECTION = "awards";

export const awardsRepository = {
  async getAwardsByUserId(userId: string): Promise<Award[]> {
    const snapshot = await firestore
      .collection(AWARDS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map((doc) => ({
      ...(doc.data() as Award),
      awardId: doc.id,
    }));
  },

  async getAwardById(awardId: string): Promise<Award> {
    const doc = await firestore.collection(AWARDS_COLLECTION).doc(awardId).get();

    if (!doc.exists) {
      throw new Error("Award not found");
    }

    return {
      ...(doc.data() as Award),
      awardId: doc.id,
    };
  },

  async getAwardByUserIdAndKey(userId: string, key: string): Promise<Award | null> {
    const snapshot = await firestore
      .collection(AWARDS_COLLECTION)
      .where("userId", "==", userId)
      .where("key", "==", key)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      ...(doc.data() as Award),
      awardId: doc.id,
    };
  },

  async create(
    userId: string,
    data: Omit<Award, "awardId" | "userId" | "createdAt" | "updatedAt">
  ): Promise<Award> {
    const ref = firestore.collection(AWARDS_COLLECTION).doc();

    const award: Award = {
      awardId: ref.id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };

    await ref.set(award);
    return award;
  },

  async update(awardId: string, data: Partial<Award>) {
    await firestore.collection(AWARDS_COLLECTION).doc(awardId).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async delete(awardId: string) {
    await firestore.collection(AWARDS_COLLECTION).doc(awardId).delete();
  },
};
