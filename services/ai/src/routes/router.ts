import { Router } from "express";
import rateLimit from "express-rate-limit";
import { internalServiceAuthMiddleware } from "../middlewares/internalServiceAuthMiddleware";
import { authMiddleware } from "../middlewares/authMiddleware";
import { buildUserContextHandler, healthHandler } from "../controllers/contextController";
import { generateNotificationMessageHandler } from "../controllers/messageGenerationController";
import {
  sendMessageHandler,
  getSessionsHandler,
  getSessionByDateHandler,
  deleteSessionHandler,
  setPreferencesHandler,
  getPreferencesHandler,
} from "../controllers/chatController";

const router = Router();

const chatMessageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: any) => req.user?.userId ?? "anonymous",
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages, please slow down." },
});

router.get("/health", healthHandler);

// User Context
router.get("/internal/context/users/:userId", internalServiceAuthMiddleware, buildUserContextHandler);

// Notification Generation
router.post("/internal/notifications/generate", internalServiceAuthMiddleware, generateNotificationMessageHandler);

// Chat
router.post("/chat/message", authMiddleware, chatMessageRateLimit, sendMessageHandler);
router.get("/chat/sessions", authMiddleware, getSessionsHandler);
router.get("/chat/sessions/:date", authMiddleware, getSessionByDateHandler);
router.delete("/chat/sessions/:date", authMiddleware, deleteSessionHandler);
router.get("/chat/preferences", authMiddleware, getPreferencesHandler);
router.patch("/chat/preferences", authMiddleware, setPreferencesHandler);

export default router;
