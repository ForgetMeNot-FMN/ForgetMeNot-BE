import { Request, Response } from "express";
import { purchaseFlowerService } from "../services/purchaseFlowerService";
import { triggerAwardCheck } from "../services/awardsClient";
import { userLanguageService } from "../services/userLanguageService";

export async function purchaseFlowerHandler(req: Request, res: Response) {

  try {

    const { userId } = req.params;

    const { flowerKey, customName } = req.body;

    if (!flowerKey)
      throw new Error("flowerKey is required");

    const locale = await userLanguageService.getLocale(
      userId,
      req.query.locale ?? req.headers["accept-language"]
    );

    const result = await purchaseFlowerService.purchaseFlower(
      userId,
      flowerKey,
      customName,
      locale
    );

    const messageId = await triggerAwardCheck({
      userId,
      eventType: "flower.purchased",
    });

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        awardEventPublished: Boolean(messageId),
        awardEventMessageId: messageId,
      },
    });

  } catch (err: any) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }
}
