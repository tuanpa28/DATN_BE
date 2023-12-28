import express from "express";
import StatisticalController from "../../controllers/statistical.controller.js";

const statisticalRouter = express.Router();

statisticalRouter
  .route("/revenue/:month")
  .get(StatisticalController.revenueByMonth);
statisticalRouter.route("/revenue").get(StatisticalController.revenueByYear);

export default statisticalRouter;
