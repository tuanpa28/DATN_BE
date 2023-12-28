import express from "express";
import { feedbackController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const routerFeedback = express.Router();

// Get All Feedback
routerFeedback.get("/", feedbackController.getAllFeedback);

// Create Feedback
routerFeedback.post(
  "/",
  authMiddleware.verifyToken,
  feedbackController.createFeedback
);

// Update Feedback
routerFeedback.put(
  "/:idFeedback",
  authMiddleware.verifyToken,
  feedbackController.updateFeedback
);

// Delete Feedback
routerFeedback.delete(
  "/:idFeedback",
  authMiddleware.verifyToken,
  feedbackController.deleteFeedback
);

routerFeedback.get(
  "/totalStarByPitch/:id_pitch",
  feedbackController.totalStarByUser
);

export default routerFeedback;
