import { Router } from "express";
import rateLimit from "express-rate-limit";
import { internalServiceAuthMiddleware } from "../middlewares/internalServiceAuthMiddleware";
import { authMiddleware } from "../middlewares/authMiddleware";
import { buildUserContextHandler, healthHandler } from "../controllers/contextController";
import {
  dispatchDailyLlmNotificationsHandler,
  generateNotificationMessageHandler,
} from "../controllers/messageGenerationController";
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
  keyGenerator: (req: any) => req.params.userId ?? "anonymous",
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
router.post("/internal/notifications/dispatch-daily", internalServiceAuthMiddleware, dispatchDailyLlmNotificationsHandler);

// Chat
router.post("/chat/:userId/message", authMiddleware, chatMessageRateLimit, sendMessageHandler);
router.get("/chat/:userId/sessions", authMiddleware, getSessionsHandler);
router.get("/chat/:userId/sessions/:date", authMiddleware, getSessionByDateHandler);
router.delete("/chat/:userId/sessions/:date", authMiddleware, deleteSessionHandler);
router.get("/chat/:userId/preferences", authMiddleware, getPreferencesHandler);
router.patch("/chat/:userId/preferences", authMiddleware, setPreferencesHandler);

export default router;
