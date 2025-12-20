import { Router } from "express";
import {
  createGardenHandler,
  getGardenHandler,
  waterGardenHandler,
  addWaterHandler,
  addCoinsHandler,
  deleteGardenHandler,
} from "../controllers/gardenController";

import {
  createFlower,
  getFlower,
  getAllFlowers,
  getBloomedFlowers,
  waterFlower,
  deleteFlower,
} from "../controllers/flowerController";

const router = Router();

router.post("/:userId", createGardenHandler);
router.get("/:userId", getGardenHandler);

router.post("/:userId/water", waterGardenHandler);
router.post("/:userId/add-water", addWaterHandler);
router.post("/:userId/add-coins", addCoinsHandler);

router.delete("/:userId", deleteGardenHandler);


/**
 * FLOWER ROUTES
 */

router.post("/:userId/flowers", createFlower);

router.get("/:userId/flowers", getAllFlowers);
router.get("/:userId/flowers/bloomed", getBloomedFlowers);
router.get("/:userId/flowers/:flowerId", getFlower);

// Water flower
router.post("/:userId/flowers/:flowerId/water", waterFlower);

router.delete("/:userId/flowers/:flowerId", deleteFlower);

export default router;
