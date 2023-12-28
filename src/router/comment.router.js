import express from "express";
import { commentController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const routerComment = express.Router();

// Get All Comment
routerComment.get("/", commentController.getAllComment);

// Get One Comment
routerComment.get("/:idComment", commentController.getComment);

// Get Comment By Post
routerComment.get("/post/:idPost", commentController.getCommentByPost);

// Create Comment
routerComment.post(
  "/",
  authMiddleware.verifyToken,
  commentController.createComment
);

// Update Comment
routerComment.put(
  "/:idComment",
  authMiddleware.verifyToken,
  commentController.updateComment
);

// Delete Comment
routerComment.delete(
  "/:idComment",
  authMiddleware.verifyToken,
  commentController.deleteComment
);

export default routerComment;
