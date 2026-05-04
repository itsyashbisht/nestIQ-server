import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addRoomImages,
  createRoom,
  deleteRoom,
  getRoomById,
  getRoomsByHotel,
  removeRoomImage,
  toggleRoomAvailability,
  updateRoom
} from "../controllers/room.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/create").post(
  verifyJWT,
  authorizeRoles("Admin"),
  createRoom,
  upload.fields([
    {
      name: "images",
      maxCount: 10,
    },
  ]),
);
router
  .route("/delete/:roomId")
  .delete(verifyJWT, authorizeRoles("Admin", "Owner"), deleteRoom);
router
  .route("/update/:roomId")
  .patch(verifyJWT, authorizeRoles("Admin"), updateRoom);
router.route("/:roomId").get(getRoomById);
router.route("/hotel/:hotelId").get(getRoomsByHotel);
router
  .route("/:roomId/toggle-room-availability")
  .put(verifyJWT, authorizeRoles("Owner"), toggleRoomAvailability);
router.route("/:roomId/add-images").post(
  verifyJWT,
  authorizeRoles("Admin"),
  addRoomImages,
  upload.fields([
    {
      name: "images",
      maxCount: 10,
    },
  ]),
);
router
  .route("/:roomId/remove-images")
  .delete(verifyJWT, authorizeRoles("Admin"), removeRoomImage);

export default router;
