import express from "express";
import { bannerController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const routerBanner = express.Router();

// GET ALL
routerBanner.get("/", bannerController.getAll);

// GET ONE
routerBanner.get("/:id", bannerController.getOne);

// CREATE
routerBanner.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  bannerController.create
);

// UPDATE
routerBanner.patch(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  bannerController.update
);

// REMOVE
routerBanner.delete(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.verifyAdmin,
  bannerController.remove
);

export default routerBanner;
