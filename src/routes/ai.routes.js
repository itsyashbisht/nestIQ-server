import { Router } from "express";
import {
  concierge,
  generateListing,
  hotelChat,
} from "../controllers/ai.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/chat", hotelChat);
router.post("/concierge", concierge);
router.post("/listing", verifyJWT, generateListing); // owners only

export default router;
