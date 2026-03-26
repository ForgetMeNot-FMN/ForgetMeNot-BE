import { Router } from "express";
import { internalServiceAuthMiddleware } from "../middlewares/internalServiceAuthMiddleware";
import { buildUserContextHandler, healthHandler } from "../controllers/contextController";
import { generateNotificationMessageHandler } from "../controllers/messageGenerationController";

const router = Router();

router.get("/health", healthHandler);

// User Context
router.get("/internal/context/users/:userId", internalServiceAuthMiddleware, buildUserContextHandler);

// Notification Generation
router.post("/internal/notifications/generate", internalServiceAuthMiddleware, generateNotificationMessageHandler);
export default router;
