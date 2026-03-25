import { Router } from "express";
import { internalServiceAuthMiddleware } from "../middlewares/internalServiceAuthMiddleware";
import {
  buildUserContextHandler,
  healthHandler,
} from "../controllers/contextController";

const router = Router();

router.get("/health", healthHandler);

router.get(
  "/internal/context/users/:userId",
  internalServiceAuthMiddleware,
  buildUserContextHandler,
);

export default router;
