import { firestore } from "../firebaseAdmin";
import { CharacterDefinition } from "../../models/characterDefinitionModel";

export const characterDefinitionRepository = {

  collection() {
    return firestore.collection("character_definitions");
  },

  async getByKey(key: string): Promise<CharacterDefinition | null> {
    const doc = await this.collection().doc(key).get();
    return doc.exists ? (doc.data() as CharacterDefinition) : null;
  },

  async create(data: CharacterDefinition) {
    const ref = this.collection().doc(data.key);

    await ref.set({
      ...data,
      createdAt: new Date(),
    });

    return data;
  },

  async getAllInStore(): Promise<CharacterDefinition[]> {
    const snap = await this.collection()
      .where("inStore", "==", true)
      .get();

    return snap.docs.map(d => d.data() as CharacterDefinition);
  },

};