import { Router } from "express";
import {
  createGardenHandler,
  getGardenHandler,
  waterGardenHandler,
  addWaterHandler,
  addCoinsHandler,
  deleteGardenHandler,
} from "../controllers/gardenController";

const router = Router();

router.post("/:userId", createGardenHandler);
router.get("/:userId", getGardenHandler);

router.post("/:userId/water", waterGardenHandler);
router.post("/:userId/add-water", addWaterHandler);
router.post("/:userId/add-coins", addCoinsHandler);

router.delete("/:userId", deleteGardenHandler);

export default router;
