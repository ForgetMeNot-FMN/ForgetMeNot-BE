import { Request, Response } from "express";
import { flowerService } from "../services/flowerService";


export async function createFlower(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const flowerData = req.body;

    const flower = await flowerService.createFlower(userId, flowerData);

    return res.status(201).json({ success: true, data: flower });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


export async function getFlower(req: Request, res: Response) {
  try {
    const { userId, flowerId } = req.params;
    const flower = await flowerService.getFlower(userId, flowerId);

    return res.json({ success: true, data: flower });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}


export async function getAllFlowers(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const flowers = await flowerService.getAllFlowers(userId);

    return res.json({ success: true, data: flowers });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}


export async function getBloomedFlowers(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const flowers = await flowerService.getAllBloomedFlowers(userId);

    return res.json({ success: true, data: flowers });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function waterFlower(req: Request, res: Response) {
  try {
    const { userId, flowerId } = req.params;

    const result = await flowerService.waterFlower(userId, flowerId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteFlower(req: Request, res: Response) {
  try {
    const { userId, flowerId } = req.params;

    await flowerService.deleteFlower(userId, flowerId);

    return res.json({ success: true, message: "Flower deleted" });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
