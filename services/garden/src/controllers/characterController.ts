import { Request, Response } from "express";
import { characterService } from "../services/characterService"; 
import { userLanguageService } from "../services/userLanguageService";

export async function getCharacterInventory(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const locale = await userLanguageService.getLocale(
      userId,
      req.query.locale ?? req.headers["accept-language"]
    );
    const data =
      await characterService.getInventory(userId, locale);

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function equipCharacterItem(req: Request, res: Response) {
  try {
    const { userId, itemId } = req.params;

    const result =
      await characterService.equipItem(userId, itemId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function unequipCharacterItem(req: Request, res: Response) {
  try {
    const { userId, itemId } = req.params;

    const result =
      await characterService.unequipItem(userId, itemId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getCurrentCharacter(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const locale = await userLanguageService.getLocale(
      userId,
      req.query.locale ?? req.headers["accept-language"]
    );

    const data =
      await characterService.getCurrent(userId, locale);

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
