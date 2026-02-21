import { characterService } from "../services/characterService"; 

export async function getCharacterInventory(req, res) {
  try {
    const { userId } = req.params;
    const data =
      await characterService.getInventory(userId);

    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function equipCharacterItem(req, res) {
  try {
    const { userId, itemId } = req.params;

    const result =
      await characterService.equipItem(userId, itemId);

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function unequipCharacterItem(req, res) {
  try {
    const { userId, itemId } = req.params;

    const result =
      await characterService.unequipItem(userId, itemId);

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

export async function getCurrentCharacter(req, res) {
  try {
    const { userId } = req.params;

    const data =
      await characterService.getCurrent(userId);

    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}