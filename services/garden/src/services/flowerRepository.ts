import { firestore } from "./firebaseAdmin";
import { Flower } from "../models/flowerModel";

export const flowerRepository = {
  collection(userId: string) {
    return firestore
      .collection("gardens")
      .doc(userId)
      .collection("flowers");
  },

  // Get single flower
  async getById(userId: string, flowerId: string): Promise<Flower | null> {
    const ref = this.collection(userId).doc(flowerId);
    const snap = await ref.get();

    if (!snap.exists) return null;

    return {
      ...(snap.data() as Flower),
      flowerId: snap.id,
    };
  },

  // Get all flowers of user
  async getAll(userId: string): Promise<Flower[]> {
    const snap = await this.collection(userId).get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as Flower),
      flowerId: doc.id, 
    }));
  },

  // Create new flower
  async create(userId: string, data: Omit<Flower, "flowerId" | "createdAt">) {
    const doc = this.collection(userId).doc(); // auto id

    const payload: Flower = {
      ...data,
      flowerId: doc.id, // doc id = flowerId
      createdAt: new Date(),
    };

    await doc.set(payload);
    return payload;
  },

  // Update flower
  async update(
    userId: string,
    flowerId: string,
    data: Partial<Flower>
  ) {
    await this.collection(userId)
      .doc(flowerId)
      .set(data, { merge: true });
  },

  // Delete flower
  async delete(userId: string, flowerId: string) {
    await this.collection(userId).doc(flowerId).delete();
  },
};
