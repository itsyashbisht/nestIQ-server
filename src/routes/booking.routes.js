import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getAllBookings,
  getBookingById,
  getMyBookings,
  updateBookingStatus
} from "../controllers/booking.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/new").post(verifyJWT, createBooking);
router
  .route("/bookings")
  .get(verifyJWT, authorizeRoles("Admin"), getAllBookings);
router.route("/my-bookings").get(verifyJWT, getMyBookings);
router.route("/:bookingId").get(verifyJWT, getBookingById);
router.route("/:bookingId/cancel").patch(verifyJWT, cancelBooking);
router
  .route("/:bookingId/status")
  .patch(verifyJWT, authorizeRoles("Admin"), updateBookingStatus);

export default router;
