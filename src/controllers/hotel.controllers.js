import { Hotel } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const getAllHotels = asyncHandler(async (req, res) => {
  const {
    city,
    category,
    vibe,
    minPrice,
    maxPrice,
    sortBy = "rating",
    limit = 12,
    page = 1,
  } = req.query;

  const filter = { isActive: true };

  if (city) filter.city = { $regex: city, $options: "i" };
  if (category) filter.category = category;
  if (vibe) filter.vibes = { $in: [vibe] };
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
  }

  const sortMap = {
    rating: { rating: -1 },
    price_asc: { pricePerNight: 1 },
    price_desc: { pricePerNight: -1 },
    newest: { createdAt: -1 },
    relevance: { rating: -1 },
  };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Hotel.countDocuments(filter);

  const hotels = await Hotel.find(filter)
    .sort(sortMap[sortBy] ?? { rating: -1 })
    .limit(Number(limit))
    .skip(skip);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { hotels, total, page: Number(page) },
        "Hotels fetched successfully!",
      ),
    );
});

export const getHotelBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  if (!slug) throw new ApiError(400, "Slug is required!");

  const hotel = await Hotel.findOne({ slug, isActive: true });
  if (!hotel) throw new ApiError(404, "Hotel not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, hotel, "Hotel fetched successfully!"));
});

export const getHotelById = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, hotel, "Hotel fetched successfully!"));
});

export const createHotel = asyncHandler(async (req, res) => {
  const ownerId = req.user?._id;
  if (!ownerId) throw new ApiError(401, "Unauthorized!");

  const {
    name,
    slug,
    description,
    city,
    state,
    address,
    category,
    vibes,
    amenities,
    pricePerNight,
    nearbyAttractions,
    checkInTime,
    checkOutTime,
  } = req.body;

  if (
    !name ||
    !slug ||
    !description ||
    !city ||
    !state ||
    !address ||
    !category ||
    !pricePerNight
  ) {
    throw new ApiError(
      400,
      "Required fields: name, slug, description, city, state, address, category, pricePerNight",
    );
  }

  const existingHotel = await Hotel.findOne({ slug });
  if (existingHotel)
    throw new ApiError(400, "A hotel with this slug already exists!");

  // Upload images if provided
  const images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploaded = await uploadOnCloudinary(file.path);
      if (uploaded)
        images.push({ url: uploaded.url, public_id: uploaded.public_id });
    }
  }

  const hotel = await Hotel.create({
    name,
    slug,
    description,
    city,
    state,
    address,
    category,
    vibes: vibes ? JSON.parse(vibes) : [],
    amenities: amenities ? JSON.parse(amenities) : [],
    nearbyAttractions: nearbyAttractions ? JSON.parse(nearbyAttractions) : [],
    pricePerNight: Number(pricePerNight),
    checkInTime: checkInTime || "14:00",
    checkOutTime: checkOutTime || "11:00",
    images,
    ownerId,
  });
  if (!hotel) throw new ApiError(500, "Failed to create hotel!");

  return res
    .status(201)
    .json(new ApiResponse(201, hotel, "Hotel created successfully!"));
});

export const updateHotel = asyncHandler(async (req, res) => {
  const ownerId = req.user?._id;
  const { hotelId } = req.params;
  if (!ownerId) throw new ApiError(401, "Unauthorized!");
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found!");

  // Only owner or admin can update
  if (
    hotel.ownerId.toString() !== ownerId.toString() &&
    req.user.role !== "ADMIN"
  ) {
    throw new ApiError(403, "You are not allowed to update this hotel!");
  }

  const allowedUpdates = [
    "name",
    "description",
    "city",
    "state",
    "address",
    "category",
    "vibes",
    "amenities",
    "pricePerNight",
    "nearbyAttractions",
    "checkInTime",
    "checkOutTime",
    "isActive",
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update!");
  }

  const updatedHotel = await Hotel.findByIdAndUpdate(
    hotelId,
    { $set: updates },
    { new: true },
  );
  if (!updatedHotel) throw new ApiError(500, "Failed to update hotel!");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedHotel, "Hotel updated successfully!"));
});

export const deleteHotel = asyncHandler(async (req, res) => {
  const ownerId = req.user?._id;
  const { hotelId } = req.params;
  if (!ownerId) throw new ApiError(401, "Unauthorized!");
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found!");

  if (
    hotel.ownerId.toString() !== ownerId.toString() &&
    req.user.role !== "ADMIN"
  ) {
    throw new ApiError(403, "You are not allowed to delete this hotel!");
  }

  // Soft delete — just mark inactive
  await Hotel.findByIdAndUpdate(hotelId, { $set: { isActive: false } });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Hotel deleted successfully!"));
});
