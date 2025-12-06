import { Request, Response } from "express";
import { gardenService } from "../services/gardenService";

export async function createGardenHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const garden = await gardenService.createGarden(userId);
    return res.status(201).json({ success: true, data: garden });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function getGardenHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const garden = await gardenService.getGarden(userId);
    return res.json({ success: true, data: garden });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function addWaterHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    const garden = await gardenService.addWater(userId, Number(amount));
    return res.json({ success: true, data: garden });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function addCoinsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { amount } = req.body;

    const garden = await gardenService.addCoins(userId, Number(amount));
    return res.json({ success: true, data: garden });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function increaseStreakHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const garden = await gardenService.increaseStreak(userId);
    return res.json({ success: true, data: garden });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteGardenHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    await gardenService.deleteGarden(userId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
