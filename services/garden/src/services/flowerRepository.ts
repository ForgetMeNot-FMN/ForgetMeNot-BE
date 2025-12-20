import { firestore } from "./firebaseAdmin";
import { Flower } from "../models/flowerModel";

export const flowerRepository = {
  collection(userId: string) {
    return firestore
      .collection("gardens")
      .doc(userId)
      .collection("flowers");
  },

  async getById(userId: string, flowerId: string): Promise<Flower | null> {
    const snap = await this.collection(userId).doc(flowerId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Flower) : null;
  },

  async getAll(userId: string): Promise<Flower[]> {
    const snap = await this.collection(userId).get();
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Flower)
    );
  },

  async create(
    userId: string,
    data: Omit<Flower, "id" | "created_at">
  ) {
    const ref = this.collection(userId).doc();

    await ref.set({
      ...data,
      created_at: new Date(),
    });

    return { id: ref.id, ...data };
  },

  async update(
    userId: string,
    flowerId: string,
    data: Partial<Flower>
  ) {
    await this.collection(userId)
      .doc(flowerId)
      .set(data, { merge: true });
  },

  async delete(userId: string, flowerId: string) {
    await this.collection(userId).doc(flowerId).delete();
  },
};
