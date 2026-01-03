import { Router } from "express";
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  updatePermissionsHandler,
  deleteUserHandler,
} from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/",authMiddleware, createUserHandler);
router.get("/:userId",authMiddleware, getUserHandler);
router.put("/:userId", authMiddleware, updateUserHandler);
router.patch("/:userId/permissions", authMiddleware, updatePermissionsHandler);
router.delete("/:userId", authMiddleware, deleteUserHandler);
export default router;
