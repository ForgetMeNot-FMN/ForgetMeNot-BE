import { flowerDefinitionRepository } from "./flowerDefinitionRepository";
import { clearCache, getCache, setCache } from "./flowerDefinitonCache";
import { logger } from "../../utils/flowerLogger";

class FlowerDefinitionService {
  async getDefaultFlowerDetails(type: string) {
  const cacheKey = `flower_def:${type}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const flower = await flowerDefinitionRepository.getByKey(type);
  if (!flower) throw new Error("Flower definition not found");

  setCache(cacheKey, flower);
  logger.info("Flower definition fetched", { type });
  return flower;
}


  async getAllAvailableFlowers() {
    return flowerDefinitionRepository.getAll();
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
