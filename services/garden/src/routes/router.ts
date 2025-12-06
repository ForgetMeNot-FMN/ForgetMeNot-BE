import { Router } from "express";
import {
  createGardenHandler,
  getGardenHandler,
  addWaterHandler,
  addCoinsHandler,
  increaseStreakHandler,
  deleteGardenHandler,
} from "../controllers/gardenController";

const router = Router();

router.post("/:userId", createGardenHandler);
router.get("/:userId", getGardenHandler);              

router.post("/:userId/water", addWaterHandler);        
router.post("/:userId/coins", addCoinsHandler);        
router.post("/:userId/streak", increaseStreakHandler);

router.delete("/:userId", deleteGardenHandler);        

export default router;
