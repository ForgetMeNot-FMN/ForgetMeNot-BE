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
      flower_id: snap.id,
    };
  },

  // Get all flowers of user
  async getAll(userId: string): Promise<Flower[]> {
    const snap = await this.collection(userId).get();

    return snap.docs.map((doc) => ({
      ...(doc.data() as Flower),
      flower_id: doc.id, 
    }));
  },

  // Create new flower
  async create(userId: string, data: Omit<Flower, "flower_id" | "created_at">) {
    const doc = this.collection(userId).doc(); // auto id

    const payload: Flower = {
      ...data,
      flower_id: doc.id, // doc id = flower_id
      created_at: new Date(),
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
