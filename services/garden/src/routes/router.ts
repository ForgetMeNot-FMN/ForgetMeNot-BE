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
import { authMiddleware } from "../middlewares/authMiddleware";
import { addDefaultFlower, getDefaultFlowerDetails } from "../controllers/flowerDefinitonsController";
import { purchaseFlowerHandler } from "../controllers/purchaseFlowerController";

const router = Router();

router.post("/:userId", authMiddleware, createGardenHandler);
router.get("/:userId", authMiddleware, getGardenHandler);

router.post("/:userId/water", authMiddleware, waterGardenHandler);
router.post("/:userId/add-water", authMiddleware, addWaterHandler);
router.post("/:userId/add-coins", authMiddleware, addCoinsHandler);

router.delete("/:userId", authMiddleware, deleteGardenHandler);

/**
 * FLOWER ROUTES
 */

router.post("/:userId/flowers", authMiddleware, createFlower);

router.get("/:userId/flowers", authMiddleware, getAllFlowers);
router.get("/:userId/flowers/bloomed", authMiddleware, getBloomedFlowers);
router.get("/:userId/flowers/:flowerId", authMiddleware, getFlower);
// Water flower
router.post("/:userId/flowers/:flowerId/water", authMiddleware, waterFlower);

router.delete("/:userId/flowers/:flowerId", authMiddleware, deleteFlower);

// Flower Definitions
router.get("/flowers/definitions/:type", authMiddleware, getDefaultFlowerDetails);

// router.post("/flowers/definitions", addDefaultFlower);
// unprotected endpoint only should be used for adding default flower definitons to db
// developers can add flowers by hitting this endpoint by running service locally

// Purchase flower
router.post("/:userId/flowers/purchase", authMiddleware, purchaseFlowerHandler);

export default router;
