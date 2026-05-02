import { Router } from "express";
import { generateListing, hotelChat } from "../controllers/ai.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { concierge } from "../controllers/concierge.controllers.js";

const router = Router();

router.post("/chat", hotelChat);
router.post("/concierge", concierge);
router.post("/listing", verifyJWT, generateListing); // owners only

export default router;
