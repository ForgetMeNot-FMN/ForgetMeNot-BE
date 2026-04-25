import { flowerDefinitionRepository } from "./flowerDefinitions/flowerDefinitionRepository";
import { Flower } from "../models/flowerModel";
import { GrowthStage } from "../utils/enums";
import { logger } from "../utils/flowerLogger";
import { firestore } from "./firebaseAdmin";
import { resolveLocalizedText, SupportedLocale } from "../utils/localization";

class PurchaseFlowerService {
  private serializeFlowerForResponse(flower: Flower) {
    const {
      flowerNameTranslations,
      isCustomName,
      ...publicFlower
    } = flower;

    return publicFlower;
  }

  async purchaseFlower(
    userId: string,
    flowerKey: string,
    customName?: string,
    locale: SupportedLocale = "en"
  ) {

    return await firestore.runTransaction(async (tx) => {

      const now = new Date();

      const gardenRef = firestore.collection("gardens").doc(userId);
      const gardenSnap = await tx.get(gardenRef);

      if (!gardenSnap.exists)
        throw new Error("Garden not found");

      const garden = gardenSnap.data();

      // Definition read
      const definition =
        await flowerDefinitionRepository.getByKey(flowerKey);

      if (!definition)
        throw new Error("Flower not found");

      if (!definition.inStore)
        throw new Error("Flower not in store");

      if ((garden.coins ?? 0) < definition.price)
        throw new Error("Not enough coins");

      const newCoins = garden.coins - definition.price;

      const flowerRef =
        gardenRef.collection("flowers").doc();

      const trimmedCustomName = customName?.trim();
      const localizedName = resolveLocalizedText(
        definition.displayNameTranslations ?? definition.displayName,
        locale,
        definition.displayName
      );

      const flower: Flower = {
        flowerId: flowerRef.id,
        flowerName: trimmedCustomName || localizedName,
        flowerNameTranslations: definition.displayNameTranslations,
        isCustomName: Boolean(trimmedCustomName),
        type: definition.key,
        growthStage: GrowthStage.SEED,
        isAlive: true,
        waterCount: 0,
        lastWateredAt: null,
        plantedAt: null,
        location: "INVENTORY",
        createdAt: now,
        updatedAt: now,
      };

      // Update garden
      tx.update(gardenRef, {
        coins: newCoins,
        totalFlowers:
          (garden.totalFlowers ?? 0) + 1,
        updatedAt: now,
      });

      // Create flower
      tx.set(flowerRef, flower);

      logger.info("Flower purchased", {
        userId,
        flowerId: flowerRef.id,
        flowerKey,
        price: definition.price,
        coinsLeft: newCoins,
      });

      return {
        flower: this.serializeFlowerForResponse(flower),
        coinsLeft: newCoins,
      };
    });
  }
}

export const purchaseFlowerService = new PurchaseFlowerService();
