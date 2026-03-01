import { flowerDefinitionService } from "../services/flowerDefinitions/FlowerDefinitionService";

export async function getDefaultFlowerDetails(req, res) {
  try {
    const { type } = req.params;
    const data = await flowerDefinitionService.getDefaultFlowerDetails(type);
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({ success: false, message: e.message });
  }
}

export async function getAllFlowerDefinitions(req, res) {
  try {
    const data = await flowerDefinitionService.getAllAvailableFlowers();
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
