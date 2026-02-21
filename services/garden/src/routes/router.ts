import { Router } from "express";
import {
  createGardenHandler,
  getGardenHandler,
  waterGardenHandler,
  addWaterHandler,
  addCoinsHandler,
  deleteGardenHandler,
  getGardenViewHandler,
} from "../controllers/gardenController";

import {
  createFlower,
  getFlower,
  getAllFlowers,
  getBloomedFlowers,
  waterFlower,
  deleteFlower,
  plantFlowerHandler,
  killFlowerHandler,
  getInventoryFlowers,
  moveFlowerToInventory,
} from "../controllers/flowerController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { addDefaultFlower, getDefaultFlowerDetails } from "../controllers/flowerDefinitonsController";
import { purchaseFlowerHandler } from "../controllers/purchaseFlowerController";

import { 
  getCharacterDefinition, 
  getAllCharacterDefinitions,
  addCharacterDefinition,
} from "../controllers/characterDefinitionController";

import { purchaseCharacterItemHandler } from "../controllers/purchaseCharacterController";
import {
  getCharacterInventory,
  equipCharacterItem,
  unequipCharacterItem,
  getCurrentCharacter,
} from "../controllers/characterController";
const router = Router();

router.post("/:userId", authMiddleware, createGardenHandler);
router.get("/:userId", authMiddleware, getGardenHandler);

router.post("/:userId/water", authMiddleware, waterGardenHandler);
router.post("/:userId/add-water", authMiddleware, addWaterHandler);
router.post("/:userId/add-coins", authMiddleware, addCoinsHandler);

router.delete("/:userId", authMiddleware, deleteGardenHandler);

router.get("/:userId/view", authMiddleware, getGardenViewHandler);

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

// Plant flower
router.post("/:userId/flowers/:flowerId/plant", authMiddleware, plantFlowerHandler);

// Inventory'deki çiçekler
router.get("/:userId/flowers/inventory", authMiddleware, getInventoryFlowers);

// Bloom olan çiçeği inventory ye gönderme
router.post("/:userId/flowers/:flowerId/move-to-inventory", authMiddleware, moveFlowerToInventory);

// Kill Flower
router.post("/:userId/flowers/:flowerId/kill", authMiddleware, killFlowerHandler);


/**
 * CHARACTER DEFINITIONS
 */

// Tek item (key ile)
router.get("/characters/definitions/:key", authMiddleware, getCharacterDefinition);

// Store’daki tüm character item’ları
router.get("/characters/definitions", authMiddleware, getAllCharacterDefinitions);

// Default item ekleme (DEV ONLY)
// router.post("/characters/definitions", addCharacterDefinition);

// Purchase character item
router.post("/:userId/characters/purchase", authMiddleware, purchaseCharacterItemHandler);

// Character inventory
router.get("/:userId/characters/inventory", authMiddleware, getCharacterInventory);

// Equip
router.post("/:userId/characters/:itemId/equip", authMiddleware, equipCharacterItem);

// Unequip
router.post("/:userId/characters/:itemId/unequip", authMiddleware, unequipCharacterItem);

// Current character
router.get("/:userId/characters/current", authMiddleware, getCurrentCharacter);

export default router;