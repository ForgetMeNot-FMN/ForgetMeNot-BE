import { Request, Response } from "express";
import { contextBuilderService } from "../services/contextBuilderService";
import { notificationDecisionService } from "../services/notificationDecisionService";

export async function decideNotificationHandler(req: Request, res: Response) {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userId) {
    return res.status(400).json({
        success: false,
        message: "userId is required",
    });
    }

    const context = await contextBuilderService.buildUserContext(userId);
    const decision = notificationDecisionService.decide(context);

    return res.json({
        success: true,
        data: decision,
    });
}