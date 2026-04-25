import { firestore } from "./firebaseAdmin";
import { CharacterSlot } from "../models/characterDefinitionModel";
import { characterDefinitionRepository } from "./characterDefinitions/characterDefinitionRepository";
import {
  resolveLocalizedText,
  SupportedLocale,
} from "../utils/localization";

const REQUIRED_SLOTS = [
  CharacterSlot.BODY,
  CharacterSlot.HEAD,
  CharacterSlot.CLOTHES,
  CharacterSlot.SHOES,
];

class CharacterService {

  private async localizeItems(items: any[], locale: SupportedLocale) {
    const keys = [...new Set(items.map(item => item.key).filter(Boolean))];
    const definitions = await Promise.all(
      keys.map(async key => [key, await characterDefinitionRepository.getByKey(key)] as const)
    );
    const definitionsByKey = new Map(definitions);

    return items.map(item => {
      const definition = definitionsByKey.get(item.key);

      return {
        ...item,
        displayName: resolveLocalizedText(
          item.displayNameTranslations ?? definition?.displayNameTranslations ?? item.displayName,
          locale,
          item.displayName ?? definition?.displayName
        ),
      };
    });
  }

  async getInventory(userId: string, locale: SupportedLocale = "en") {
    const snap = await firestore
      .collection("gardens")
      .doc(userId)
      .collection("character_items")
      .get();

    const items = snap.docs.map(d => d.data());
    return this.localizeItems(items, locale);
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

  async getCurrent(userId: string, locale: SupportedLocale = "en") {
    const snap = await firestore
      .collection("gardens")
      .doc(userId)
      .collection("character_items")
      .where("equipped", "==", true)
      .get();

    const equipped = await this.localizeItems(snap.docs.map(d => d.data()), locale);

    return {
      BODY: equipped.find(i => i.slot === "BODY"),
      HEAD: equipped.find(i => i.slot === "HEAD"),
      HAIR_BACK: equipped.find(i => i.slot === "HAIR_BACK") ?? null,
      HAIR_FRONT: equipped.find(i => i.slot === "HAIR_FRONT") ?? null,
      CLOTHES: equipped.find(i => i.slot === "CLOTHES"),
      SHOES: equipped.find(i => i.slot === "SHOES"),
      ACCESSORY: equipped.find(i => i.slot === "ACCESSORY") ?? null,
    };
  }
  
}

export const characterService = new CharacterService();
