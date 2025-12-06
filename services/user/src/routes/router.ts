import { Router } from "express";
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  updatePermissionsHandler,
  deleteUserHandler,
} from "../controllers/userController";

const router = Router();

router.post("/", createUserHandler);
router.get("/:userId", getUserHandler);
router.put("/:userId", updateUserHandler);
router.patch("/:userId/permissions", updatePermissionsHandler);
router.delete("/:userId", deleteUserHandler);

export default router;
