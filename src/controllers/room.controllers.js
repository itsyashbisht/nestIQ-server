import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Room } from "../models/index.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

export const getRoomsByHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const rooms = await Room.find({ hotelId, isAvailable: true }).sort({
    pricePerNight: 1,
  });
  if (!rooms) throw new ApiError(500, "Failed to fetch rooms!");

  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "Rooms fetched successfully!"));
});

export const getRoomById = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) throw new ApiError(400, "Room ID is required!");

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully!"));
});

export const createRoom = asyncHandler(async (req, res) => {
  const {
    hotelId,
    name,
    type,
    description,
    pricePerNight,
    maxGuests,
    amenities,
    totalRooms,
  } = req.body;

  if (
    !hotelId ||
    !name ||
    !type ||
    !description ||
    !pricePerNight ||
    !maxGuests
  ) {
    throw new ApiError(
      400,
      "hotelId, name, type, description, pricePerNight and maxGuests are required!",
    );
  }

  // Upload images to Cloudinary if provided
  const images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadOnCloudinary(file.path);
      if (!uploaded) throw new ApiError(500, "Failed to upload room image!");

      images.push({ url: uploaded.url, public_id: uploaded.public_id });
    }
  }

  const room = await Room.create({
    hotelId,
    name,
    type,
    description,
    pricePerNight: Number(pricePerNight),
    maxGuests: Number(maxGuests),
    amenities: amenities ? JSON.parse(amenities) : [],
    totalRooms: totalRooms ? Number(totalRooms) : 1,
    images,
    isAvailable: true,
  });
  if (!room) throw new ApiError(500, "Failed to create room!");

  return res
    .status(201)
    .json(new ApiResponse(201, room, "Room created successfully!"));
});

export const updateRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) throw new ApiError(400, "Room ID is required!");

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  const allowedUpdates = [
    "name",
    "type",
    "description",
    "pricePerNight",
    "maxGuests",
    "amenities",
    "isAvailable",
    "totalRooms",
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update!");
  }

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $set: updates },
    { new: true },
  );
  if (!updatedRoom) throw new ApiError(500, "Failed to update room!");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRoom, "Room updated successfully!"));
});

export const addRoomImages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) throw new ApiError(400, "Room ID is required!");

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "At least one image is required!");
  }

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  const newImages = [];
  for (const file of req.files) {
    const uploaded = await uploadOnCloudinary(file.path);
    if (!uploaded) throw new ApiError(500, "Failed to upload image!");
    newImages.push({ url: uploaded.url, public_id: uploaded.public_id });
  }

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $push: { images: { $each: newImages } } },
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRoom, "Images added successfully!"));
});

/* (Owner / Admin) */
export const removeRoomImage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { publicId } = req.body;
  if (!roomId) throw new ApiError(400, "Room ID is required!");
  if (!publicId) throw new ApiError(400, "Image public_id is required!");

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  // Delete from Cloudinary first
  await deleteFromCloudinary(publicId);

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $pull: { images: { public_id: publicId } } },
    { new: true },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRoom, "Image removed successfully!"));
});

export const toggleRoomAvailability = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) throw new ApiError(400, "Room ID is required!");

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $set: { isAvailable: !room.isAvailable } },
    { new: true },
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedRoom,
        `Room is now ${updatedRoom.isAvailable ? "available" : "unavailable"}!`,
      ),
    );
});

export const deleteRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId) throw new ApiError(400, "Room ID is required!");

  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found!");

  // Delete all room images from Cloudinary
  if (room.images.length > 0) {
    for (const image of room.images) {
      await deleteFromCloudinary(image.public_id);
    }
  }

  await Room.findByIdAndDelete(roomId);

  return res
    .status(200)
    .json(new ApiResponse(200, roomId, "Room deleted successfully!"));
});
