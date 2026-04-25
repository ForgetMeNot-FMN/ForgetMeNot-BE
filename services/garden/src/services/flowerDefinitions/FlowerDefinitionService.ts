import { flowerDefinitionRepository } from "./flowerDefinitionRepository";
import { clearCache, getCache, setCache } from "./flowerDefinitionCache";
import { logger } from "../../utils/flowerLogger";
import { localizeFlowerDefinition, SupportedLocale } from "../../utils/localization";

class FlowerDefinitionService {
  async getDefaultFlowerDetails(type: string, locale: SupportedLocale = "en") {
  const cacheKey = `flower_def:${type}`;
  const cached = getCache(cacheKey);
  if (cached) return localizeFlowerDefinition(cached, locale);

  const flower = await flowerDefinitionRepository.getByKey(type);
  if (!flower) throw new Error("Flower definition not found");

  setCache(cacheKey, flower);
  logger.info("Flower definition fetched", { type });
  return localizeFlowerDefinition(flower, locale);
}


  async getAllAvailableFlowers(locale: SupportedLocale = "en") {
    const flowers = await flowerDefinitionRepository.getAll();
    return flowers.map(flower => localizeFlowerDefinition(flower, locale));
  }

  async addDefaultFlower(data: any) {
    if (!data.key) throw new Error("key is required");
    if (!data.displayName) throw new Error("displayName is required");
    if (!data.price) throw new Error("price is required");

    const exists = await flowerDefinitionRepository.getByKey(data.key);
    if (exists) throw new Error("Flower already exists");
    
    clearCache();
    logger.info("Flower definition added", { key: data.key });
    return flowerDefinitionRepository.create({
      ...data,
      inStore: true,
    });
  }
}

export const flowerDefinitionService = new FlowerDefinitionService();
