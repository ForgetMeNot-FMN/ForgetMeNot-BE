import { firestore } from "./firebaseAdmin";
import { characterDefinitionRepository } from "./characterDefinitions/characterDefinitionRepository";
import { logger } from "../utils/logger";

class PurchaseCharacterItemService {

  async purchaseItem(
    userId: string,
    itemKey: string
  ) {
    return await firestore.runTransaction(async (tx) => {

      const now = new Date();

      const gardenRef = firestore.collection("gardens").doc(userId);
      const gardenSnap = await tx.get(gardenRef);

      if (!gardenSnap.exists)
        throw new Error("Garden not found");

      const garden = gardenSnap.data()!;

      // Definition
      const definition =
        await characterDefinitionRepository.getByKey(itemKey);

      if (!definition)
        throw new Error("Character item not found");

      if (!definition.inStore)
        throw new Error("Item not in store");

      if ((garden.coins ?? 0) < definition.price)
        throw new Error("Not enough coins");

      const newCoins = garden.coins - definition.price;

      // inventory ref
      const itemRef =
        gardenRef.collection("character_items").doc();

      const item = {
        itemId: itemRef.id,
        key: definition.key,
        displayName: definition.displayName,
        category: definition.category,
        slot: definition.slot,
        price: definition.price,

        equipped: false,

        createdAt: now,
        updatedAt: now,
      };

      // update garden
      tx.update(gardenRef, {
        coins: newCoins,
        updatedAt: now,
      });

      // save item
      tx.set(itemRef, item);

      logger.info("Character item purchased", {
        userId,
        itemKey,
        price: definition.price,
        coinsLeft: newCoins,
      });

      return {
        item,
        coinsLeft: newCoins,
      };
    });
  }
}

export const purchaseCharacterItemService = new PurchaseCharacterItemService();