import { Request, Response } from "express";
import { purchaseFlowerService } from "../services/purchaseFlowerService";

export async function purchaseFlowerHandler(req: Request, res: Response) {

  try {

    const { userId } = req.params;

    const { flowerKey, customName } = req.body;

    if (!flowerKey)
      throw new Error("flowerKey is required");

    const result = await purchaseFlowerService.purchaseFlower(
      userId,
      flowerKey,
      customName
    );

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (err: any) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }
}