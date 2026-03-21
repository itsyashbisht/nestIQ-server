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

const router = Router();

router.route("/").get(getAllHotels);
router
  .route("/")
  .post(verifyJWT, authorizeRoles("Owner", "Admin"), createHotel);
router.route("/slug/:slug").get(getHotelBySlug);
router.route("/:hotelId").get(getHotelById);
router
  .route("/:hotelId")
  .patch(verifyJWT, authorizeRoles("Owner", "Admin"), updateHotel)
  .delete(verifyJWT, authorizeRoles("Owner", "Admin"), deleteHotel);

export default router;
