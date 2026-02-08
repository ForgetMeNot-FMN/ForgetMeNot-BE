import { firestore } from "../services/firebaseAdmin";

export const gardenClient = {
  async addReward(userId: string, coins: number, water: number) {
    const ref = firestore.collection("gardens").doc(userId);

    await firestore.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error("Garden not found");

      const data = snap.data()!;
      t.update(ref, {
        coins: (data.coins || 0) + coins,
        water: (data.water || 0) + water
      });
    });
  },
};
