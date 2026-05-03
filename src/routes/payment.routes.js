import { Router } from "express";
import { getRazorpayKey, verifyPayment } from "../controllers/payment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/verify").post(verifyPayment);
router.route("/razorpayKey").get(getRazorpayKey);

export default router;
