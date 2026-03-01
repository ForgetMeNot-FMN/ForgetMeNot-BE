import { Request, Response } from "express";
import { awardsService } from "../services/awardsService";

export async function getAwardsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const awards = await awardsService.getAwards(userId);
    return res.json({ success: true, data: awards });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function getAwardHandler(req: Request, res: Response) {
  try {
    const { awardId } = req.params;
    const award = await awardsService.getAward(awardId);
    return res.json({ success: true, data: award });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

export async function createAwardHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const body = req.body;

    const award = await awardsService.createAward(userId, body);

    return res.status(201).json({ success: true, data: award });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateAwardHandler(req: Request, res: Response) {
  try {
    const { awardId } = req.params;
    const body = req.body;

    const award = await awardsService.updateAward(awardId, body);

    return res.json({ success: true, data: award });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteAwardHandler(req: Request, res: Response) {
  try {
    const { awardId } = req.params;

    await awardsService.deleteAward(awardId);

    return res.json({
      success: true,
      message: "Award deleted successfully",
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function checkAwardsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const result = await awardsService.checkAwards(userId);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
