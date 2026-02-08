import { FlowerDefinition } from "../../models/flowerDefinitonModel";
import { firestore } from "../firebaseAdmin";

export const flowerDefinitionRepository = {
  collection() {
    return firestore.collection("flower_definitions");
  },

  async getByKey(key: string) {
    const doc = await this.collection().doc(key).get();
    return doc.exists ? doc.data() : null;
  },
  
  async create(data: FlowerDefinition) {
    const ref = this.collection().doc(data.key);
    await ref.set({
      ...data,
      createdAt: new Date(),
    });
    return data;
  },

  async getAll() {
    const snap = await this.collection().where("inStore", "==", true).get();
    return snap.docs.map(d => d.data());
  }
};