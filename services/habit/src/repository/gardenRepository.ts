import { firestore } from "../services/firebaseAdmin";

const COLLECTION = "gardens";

export const gardenRepository = {
  async rewardUser(userId: string) {
    const ref = firestore.collection(COLLECTION).doc(userId);

    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const data = snap.data()!;
      tx.update(ref, {
        coins: (data.coins || 0) + 5,
        water: (data.water || 0) + 1,
        updated_at: new Date(),
      });
    });
  },
};
