import { firestore } from "./firebaseAdmin";
import { CharacterSlot } from "../models/characterDefinitionModel";

const REQUIRED_SLOTS = [
  CharacterSlot.BODY,
  CharacterSlot.HEAD,
  CharacterSlot.HAIR_BACK,
  CharacterSlot.HAIR_FRONT,
  CharacterSlot.CLOTHES,
  CharacterSlot.SHOES,
];

class CharacterService {

  async getInventory(userId: string) {
    const snap = await firestore
      .collection("gardens")
      .doc(userId)
      .collection("character_items")
      .get();

    return snap.docs.map(d => d.data());
  }

  async equipItem(userId: string, itemId: string) {

    return await firestore.runTransaction(async (tx) => {

      const itemsRef =
        firestore
          .collection("gardens")
          .doc(userId)
          .collection("character_items");

      const itemRef = itemsRef.doc(itemId);
      const itemSnap = await tx.get(itemRef);

      if (!itemSnap.exists)
        throw new Error("Item not found");

      const item = itemSnap.data()!;

      if (item.equipped)
        throw new Error("Item already equipped");

      // aynı slotta equipli item varsa onu düşür
      const equippedSnap = await tx.get(
        itemsRef
          .where("slot", "==", item.slot)
          .where("equipped", "==", true)
          .limit(1)
      );

      if (!equippedSnap.empty) {
        const oldRef = equippedSnap.docs[0].ref;
        tx.update(oldRef, {
          equipped: false,
          updatedAt: new Date(),
        });
      }

      tx.update(itemRef, {
        equipped: true,
        updatedAt: new Date(),
      });

      return { success: true };
    });
  }

  async unequipItem(userId: string, itemId: string) {

    return await firestore.runTransaction(async (tx) => {

      const itemRef =
        firestore
          .collection("gardens")
          .doc(userId)
          .collection("character_items")
          .doc(itemId);

      const snap = await tx.get(itemRef);

      if (!snap.exists)
        throw new Error("Item not found");

      const item = snap.data()!;

      if (!item.equipped)
        throw new Error("Item is not equipped");

      if (REQUIRED_SLOTS.includes(item.slot))
        throw new Error("Required slot cannot be unequipped");

      tx.update(itemRef, {
        equipped: false,
        updatedAt: new Date(),
      });

      return { success: true };
    });
  }

  async getCurrent(userId: string) {
    const snap = await firestore
      .collection("gardens")
      .doc(userId)
      .collection("character_items")
      .where("equipped", "==", true)
      .get();

    const equipped = snap.docs.map(d => d.data());

    return {
      BODY: equipped.find(i => i.slot === "BODY"),
      HEAD: equipped.find(i => i.slot === "HEAD"),
      HAIR_BACK: equipped.find(i => i.slot === "HAIR_BACK"),
      HAIR_FRONT: equipped.find(i => i.slot === "HAIR_FRONT"),
      CLOTHES: equipped.find(i => i.slot === "CLOTHES"),
      SHOES: equipped.find(i => i.slot === "SHOES"),
      ACCESSORY: equipped.find(i => i.slot === "ACCESSORY") ?? null,
    };
  }
  
}

export const characterService = new CharacterService();