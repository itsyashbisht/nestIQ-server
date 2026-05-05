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
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/all").get(getAllHotels);
router.post("/search", aiSearch);
router.route("/create").post(
  verifyJWT,
  authorizeRoles("Owner", "Admin"),
  createHotel,
  upload.fields([
    {
      name: "images",
      maxCount: 7,
    },
  ]),
);
router.route("/slug/:slug").get(getHotelBySlug);
router.route("/:hotelId").get(getHotelById);
router
  .route("/:hotelId")
  .patch(verifyJWT, authorizeRoles("Owner", "Admin"), updateHotel)
  .delete(verifyJWT, authorizeRoles("Owner", "Admin"), deleteHotel);

export default router;
