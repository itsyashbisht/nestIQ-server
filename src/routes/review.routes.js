import { Router } from "express";
import {
  addReview,
  getHotelReviews,
  removeReview,
} from "../controllers/review.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/hotel/:hotelId").get(getHotelReviews);
router.route("/hotel/:hotelId").post(verifyJWT, addReview);
router.route("/:reviewId").delete(verifyJWT, removeReview);

export default router;
