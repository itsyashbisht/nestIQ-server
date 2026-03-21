import { Booking, Review } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const addReview = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  const { hotelId } = req.params;
  if (!guestId) throw new ApiError(401, "Unauthorized!");
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const { rating, title, comment, bookingId } = req.body;

  if (!rating || !comment) {
    throw new ApiError(400, "Rating and comment are required!");
  }
  if (Number(rating) < 1 || Number(rating) > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5!");
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({ guestId, hotelId });
  if (existingReview)
    throw new ApiError(400, "You have already reviewed this hotel!");

  // Check if booking is completed (verified review)
  let isVerified = false;
  if (bookingId) {
    const booking = await Booking.findOne({
      _id: bookingId,
      guestId,
      hotelId,
      status: "completed",
    });
    isVerified = !!booking;
  }

  const review = await Review.create({
    guestId,
    hotelId,
    bookingId: bookingId || undefined,
    rating: Number(rating),
    title: title || "",
    comment,
    isVerified,
  });
  if (!review) throw new ApiError(500, "Failed to create review!");

  return res
    .status(201)
    .json(new ApiResponse(201, review, "Review added successfully!"));
});

export const removeReview = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  const { reviewId } = req.params;
  if (!guestId) throw new ApiError(401, "Unauthorized!");
  if (!reviewId) throw new ApiError(400, "Review ID is required!");

  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found!");

  // Only the author or admin can delete
  if (
    review.guestId.toString() !== guestId.toString() &&
    req.user.role !== "ADMIN"
  ) {
    throw new ApiError(403, "You are not allowed to delete this review!");
  }

  await Review.findByIdAndDelete(reviewId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Review removed successfully!"));
});

export const getHotelReviews = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  if (!hotelId) throw new ApiError(400, "Hotel ID is required!");

  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const total = await Review.countDocuments({ hotelId });

  const reviews = await Review.find({ hotelId })
    .populate("guestId", "fullname username")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(skip);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { reviews, total, page: Number(page) },
        "Reviews fetched successfully!",
      ),
    );
});
