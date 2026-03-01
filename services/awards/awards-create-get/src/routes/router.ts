import { Router } from "express";
import {
  getAwardsHandler,
  getAwardHandler,
  createAwardHandler,
  updateAwardHandler,
  deleteAwardHandler,
  checkAwardsHandler,
} from "../controllers/awardsController";
import { healthHandler } from "../controllers/healthController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { internalAuthMiddleware } from "../middlewares/internalAuthMiddleware";

const router = Router();

router.get("/health", healthHandler);
router.post("/internal/:userId/check", internalAuthMiddleware, checkAwardsHandler);

router.get("/user/:userId", authMiddleware, getAwardsHandler);
router.get("/:awardId", authMiddleware, getAwardHandler);
router.post("/:userId", authMiddleware, createAwardHandler);
router.post("/:userId/check", authMiddleware, checkAwardsHandler);
router.patch("/:awardId", authMiddleware, updateAwardHandler);
router.delete("/:awardId", authMiddleware, deleteAwardHandler);

export default router;
