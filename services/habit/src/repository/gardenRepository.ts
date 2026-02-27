import { firestore } from "../services/firebaseAdmin";

const COLLECTION = "gardens";

export const gardenRepository = {
  async rewardUserInTransaction(
    tx: FirebaseFirestore.Transaction,
    userId: string,
    coins: number,
    water: number,
  ) {
    const ref = firestore.collection(COLLECTION).doc(userId);
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const data = snap.data()!;
    tx.update(ref, {
      coins: (data.coins || 0) + coins,
      water: (data.water || 0) + water,
      updated_at: new Date(),
    });
  },

  async rewardUser(userId: string, coins: number, water: number) {
    await firestore.runTransaction(async (tx) => {
      await this.rewardUserInTransaction(tx, userId, coins, water);
    });
  },
};
