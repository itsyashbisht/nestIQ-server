import { Router } from "express";
import {
  createHotel,
  deleteHotel,
  getAllHotels,
  getHotelById,
  getHotelBySlug,
  updateHotel,
} from "../controllers/hotel.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { aiSearch } from "../controllers/ai.controllers.js";

const router = Router();

router.route("/all").get(getAllHotels);
router.post("/search", aiSearch);
router
  .route("/create")
  .post(verifyJWT, authorizeRoles("Owner", "Admin"), createHotel);
router.route("/slug/:slug").get(getHotelBySlug);
router.route("/:hotelId").get(getHotelById);
router
  .route("/:hotelId")
  .patch(verifyJWT, authorizeRoles("Owner", "Admin"), updateHotel)
  .delete(verifyJWT, authorizeRoles("Owner", "Admin"), deleteHotel);

export default router;
