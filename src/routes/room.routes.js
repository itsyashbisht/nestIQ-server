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
  updateRoom,
} from "../controllers/room.controllers.js";

const router = Router();
router.use(verifyJWT);

router.route("/create").post(createRoom);
router.route("/delete/:roomId").delete(deleteRoom);
router.route("/update/:roomId").patch(updateRoom);
router.route("/:roomId").get(getRoomById);
router.route("/hotel/:hotelId").get(getRoomsByHotel);
router.route("/:roomId/toggle-room-availability").put(toggleRoomAvailability);
router.route("/:roomId/add-images").post(addRoomImages);
router.route("/:roomId/remove-images").delete(removeRoomImage);

export default router;
