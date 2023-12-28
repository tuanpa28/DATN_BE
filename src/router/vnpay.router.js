import express from "express";
import PayMentController from "../controllers/vnpay.controller.js";
import * as PaymentValidators from "../validations/vnpay.validator.js";

const routerPayment = express.Router();

routerPayment.post(
  "/create-url",
  PaymentValidators.validation,
  PayMentController.createUrl
);
routerPayment.get("/vnpay_ipn", PayMentController.getDataReturn);

export default routerPayment;
