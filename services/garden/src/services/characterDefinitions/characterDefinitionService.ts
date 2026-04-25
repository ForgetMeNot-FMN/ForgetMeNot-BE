import { characterDefinitionRepository } from "./characterDefinitionRepository";
import { getCache, setCache, clearCache } from "./characterDefinitionCache";
import { logger } from "../../utils/logger";
import { localizeCharacterDefinition, SupportedLocale } from "../../utils/localization";

class CharacterDefinitionService {

  async getItemDetails(key: string, locale: SupportedLocale = "en") {
    const cacheKey = `character_def:${key}`;

    const cached = getCache(cacheKey);
    if (cached) return localizeCharacterDefinition(cached, locale);

    const item =
      await characterDefinitionRepository.getByKey(key);

    if (!item)
      throw new Error("Character item definition not found");

    setCache(cacheKey, item);

    logger.info("Character item definition fetched", { key });

    return localizeCharacterDefinition(item, locale);
  }

  async getAllAvailableItems(locale: SupportedLocale = "en") {
    const items = await characterDefinitionRepository.getAllInStore();
    return items.map(item => localizeCharacterDefinition(item, locale));
  }

  async addDefaultItem(data: any) {

    if (!data.key)
      throw new Error("key is required");

    if (!data.displayName)
      throw new Error("displayName is required");

    if (!data.slot)
      throw new Error("slot is required");

    if (!data.category)
      throw new Error("category is required");

    if (data.price == null)
      throw new Error("price is required");

    const exists =
      await characterDefinitionRepository.getByKey(data.key);

    if (exists)
      throw new Error("Character item already exists");

    clearCache();

    logger.info("Character item definition added", {
      key: data.key,
      slot: data.slot,
    });

    return characterDefinitionRepository.create({
      ...data,
      inStore: true,
    });
  }
}

export const characterDefinitionService = new CharacterDefinitionService();
