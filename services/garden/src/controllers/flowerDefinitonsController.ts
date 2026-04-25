import { flowerDefinitionService } from "../services/flowerDefinitions/FlowerDefinitionService";
import { userLanguageService } from "../services/userLanguageService";

export async function getDefaultFlowerDetails(req, res) {
  try {
    const { type } = req.params;
    const locale = await userLanguageService.getLocale(
      req.user?.userId,
      req.query.locale ?? req.headers["accept-language"]
    );
    const data = await flowerDefinitionService.getDefaultFlowerDetails(type, locale);
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({ success: false, message: e.message });
  }
}

export async function getAllFlowerDefinitions(req, res) {
  try {
    const locale = await userLanguageService.getLocale(
      req.user?.userId,
      req.query.locale ?? req.headers["accept-language"]
    );
    const data = await flowerDefinitionService.getAllAvailableFlowers(locale);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function addDefaultFlower(req, res) {
  try {
    const flower = await flowerDefinitionService.addDefaultFlower(req.body);
    res.status(201).json({ success: true, data: flower });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}
