import express from "express";
import { serviceController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const routerService = express.Router();

// GET ALL
routerService.get("/", serviceController.getAll);

// GET by user
routerService.get("/:idUser", serviceController.getById);

// CREATE
routerService.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdminPitch,
  serviceController.create
);

// UPDATE
routerService.patch(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdminPitch,
  serviceController.update
);

// REMOVE
routerService.delete(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdminPitch,
  serviceController.remove
);

export default routerService;
