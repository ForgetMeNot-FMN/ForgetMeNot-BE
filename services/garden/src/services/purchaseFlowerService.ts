import { gardenRepository } from "./gardenRepository";
import { flowerRepository } from "./flowerRepository";
import { flowerDefinitionRepository } from "./flowerDefinitions/flowerDefinitionRepository";
import { GrowthStage } from "../utils/enums";
import { logger } from "../utils/flowerLogger";

class PurchaseFlowerService {

  async purchaseFlower(userId: string, flowerKey: string, customName?: string) {

    const definition = await flowerDefinitionRepository.getByKey(flowerKey);

    if (!definition)
      throw new Error("Flower not found in store");

    if (!definition.inStore)
      throw new Error("Flower is not available in store");

    const garden = await gardenRepository.getByUserId(userId);

    if (!garden)
      throw new Error("Garden not found");

    // Coin kontrolü
    if (garden.coins < definition.price)
      throw new Error("Not enough coins");

    // Coin azaltma
    const newCoins = garden.coins - definition.price;

    await gardenRepository.update(userId, {
      coins: newCoins,
      totalFlowers: garden.totalFlowers + 1,
    });

    const flower = await flowerRepository.create(userId, {
      flowerName: customName || definition.displayName,
      type: definition.key,
      growthStage: GrowthStage.SEED,
      isAlive: true,
      waterCount: 0,
      lastWateredAt: null,
    });

    logger.info("Flower purchased", {
      userId,
      flowerId: flower.flowerId,
      flowerKey,
      price: definition.price,
      coinsLeft: newCoins,
    });

    return {
      flower,
      coinsLeft: newCoins,
    };
  }
}

export const purchaseFlowerService = new PurchaseFlowerService();