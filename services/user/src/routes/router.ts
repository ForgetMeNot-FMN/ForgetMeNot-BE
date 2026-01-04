import { Router } from "express";
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  updatePermissionsHandler,
  deleteUserHandler,
  addFcmTokenHandler,
  setAllowNotificationHandler
} from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/",authMiddleware, createUserHandler);
router.get("/:userId",authMiddleware, getUserHandler);
router.put("/:userId", authMiddleware, updateUserHandler);
router.patch("/:userId/permissions", authMiddleware, updatePermissionsHandler);
router.delete("/:userId", authMiddleware, deleteUserHandler);
router.post("/:userId/fcm-token", authMiddleware, addFcmTokenHandler);
router.post("/:userId/allow-notification", authMiddleware, setAllowNotificationHandler);

export default router;
