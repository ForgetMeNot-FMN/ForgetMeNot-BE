import { characterDefinitionService } from "../services/characterDefinitions/characterDefinitionService";
import { userLanguageService } from "../services/userLanguageService";

// Tek bir item detayı (key ile)
export async function getCharacterDefinition(req, res) {
  try {
    const { key } = req.params;
    const locale = await userLanguageService.getLocale(
      req.user?.userId,
      req.query.locale ?? req.headers["accept-language"]
    );

    const data =
      await characterDefinitionService.getItemDetails(key, locale);

    return res.json({
      success: true,
      data,
    });
  } catch (e) {
    return res.status(404).json({
      success: false,
      message: e.message,
    });
  }
}

// Store’da olan tüm item’lar
export async function getAllCharacterDefinitions(req, res) {
  try {
    const locale = await userLanguageService.getLocale(
      req.user?.userId,
      req.query.locale ?? req.headers["accept-language"]
    );
    const data =
      await characterDefinitionService.getAllAvailableItems(locale);

    return res.json({
      success: true,
      data,
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: e.message,
    });
  }
}

// Default item ekleme (dev only)
export async function addCharacterDefinition(req, res) {
  try {
    const item =
      await characterDefinitionService.addDefaultItem(req.body);

    return res.status(201).json({
      success: true,
      data: item,
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: e.message,
    });
  }
}
