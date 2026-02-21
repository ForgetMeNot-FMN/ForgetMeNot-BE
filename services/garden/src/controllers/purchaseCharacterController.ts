import { Request, Response } from "express";
import { purchaseCharacterItemService } from "../services/purchaseCharacterItemService";

export async function purchaseCharacterItemHandler(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.params;
    const { itemKey } = req.body;

    if (!itemKey)
      throw new Error("itemKey is required");

    const result =
      await purchaseCharacterItemService.purchaseItem(
        userId,
        itemKey
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