import { Booking, Hotel } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { razorpayInstance } from "../utils/razorpay.js";
import { Payment } from "../models/payment.model.js";

const GST_RATE = 0.12; // 12%

const createBooking = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  if (!guestId) throw new ApiError(401, "Unauthorized!");

  const { hotelId, roomId, checkIn, checkOut, guests, specialRequests } =
    req.body;

  if (!hotelId || !checkIn || !checkOut || !guests) {
    throw new ApiError(
      400,
      "hotelId, checkIn, checkOut and guests are required!",
    );
  }

  // Validate dates
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) {
    throw new ApiError(400, "Check-out must be after check-in!");
  }
  if (checkInDate < new Date()) {
    throw new ApiError(400, "Check-in date cannot be in the past!");
  }

  // Get hotel for price
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new ApiError(404, "Hotel not found!");
  if (!hotel.isActive)
    throw new ApiError(400, "This hotel is no longer available!");

  // Calculate pricing
  const nights = Math.ceil(
    (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
  );
  const pricePerNight = roomId ? req.body.pricePerNight : hotel.pricePerNight;
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * GST_RATE);
  const totalAmount = subtotal + taxes;

  // Creating booking in DB
  const booking = await Booking.create({
    guestId,
    hotelId,
    roomId: roomId || undefined,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    nights,
    guests: Number(guests),
    pricePerNight,
    subtotal,
    taxes,
    totalAmount,
    specialRequests: specialRequests || "",
    status: "pending",
  });
  if (!booking) throw new ApiError(500, "Failed to create booking!");

  const options = {
    amount: totalAmount * 100,
    currency: "INR",
    recipt: `booking-${booking._id}`,
  };

  // Razorpay Order
  const razorpayOrder = await razorpayInstance.orders.create(options);
  if (!order) throw new ApiError(500, "Failed to create razorpay order!");

  // Creating payment
  const payment = await Payment.create({
    bookingId: booking._id,
    guestId,
    hotelId,
    razorpayOrderId: razorpayOrder.id,
    amount: booking.totalAmount,
    currency: options.currency,
    status: "created",
    recipt: razorpayOrder.recipt,
  });
  if (!payment)
    throw new ApiError(500, "Failed to create payment for booking!");

  // Save orderId on booking
  await Booking.findByIdAndUpdate(booking._id, {
    $set: { razorpayOrderId: razorpayOrder.id },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { booking, totalAmount, paymentRecipt: payment.recipt },
        "Booking created successfully!",
      ),
    );
});

const getMyBookings = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  if (!guestId) throw new ApiError(401, "Unauthorized!");

  const bookings = await Booking.find({ guestId })
    .populate("hotelId", "name city state images rating slug")
    .populate("roomId", "name type")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Bookings fetched successfully!"));
});

const getBookingById = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  const { bookingId } = req.params;
  if (!guestId) throw new ApiError(401, "Unauthorized!");
  if (!bookingId) throw new ApiError(400, "Booking ID is required!");

  const booking = await Booking.findById(bookingId)
    .populate(
      "hotelId",
      "name city state images rating slug checkInTime checkOutTime",
    )
    .populate("roomId", "name type pricePerNight");
  if (!booking) throw new ApiError(404, "Booking not found!");

  // Only the guest or admin can view
  if (
    booking.guestId.toString() !== guestId.toString() &&
    req.user.role !== "ADMIN"
  ) {
    throw new ApiError(403, "You are not allowed to view this booking!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking fetched successfully!"));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const guestId = req.user?._id;
  const { bookingId } = req.params;
  if (!guestId) throw new ApiError(401, "Unauthorized!");
  if (!bookingId) throw new ApiError(400, "Booking ID is required!");

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found!");

  if (booking.guestId.toString() !== guestId.toString()) {
    throw new ApiError(403, "You are not allowed to cancel this booking!");
  }

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Booking is already cancelled!");
  }
  if (booking.status === "completed") {
    throw new ApiError(400, "Completed bookings cannot be cancelled!");
  }

  // 48-hour cancellation policy
  const hoursUntilCheckIn =
    (new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilCheckIn < 48) {
    throw new ApiError(
      400,
      "Bookings cannot be cancelled within 48 hours of check-in!",
    );
  }

  const cancelledBooking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: { status: "cancelled" } },
    { new: true },
  );
  if (!cancelledBooking) throw new ApiError(500, "Failed to cancel booking!");

  return res
    .status(200)
    .json(
      new ApiResponse(200, cancelledBooking, "Booking cancelled successfully!"),
    );
});

const getAllBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Booking.countDocuments(filter);

  const bookings = await Booking.find(filter)
    .populate("guestId", "fullname email username")
    .populate("hotelId", "name city")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(skip);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bookings, total, page: Number(page) },
        "All bookings fetched!",
      ),
    );
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  if (!bookingId) throw new ApiError(400, "Booking ID is required!");
  if (!status) throw new ApiError(400, "Status is required!");

  const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Status must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    { $set: { status } },
    { new: true },
  );
  if (!booking) throw new ApiError(404, "Booking not found!");

  return res
    .status(200)
    .json(
      new ApiResponse(200, booking, `Booking status updated to ${status}!`),
    );
});

export {
  getAllBookings,
  updateBookingStatus,
  cancelBooking,
  createBooking,
  getMyBookings,
  getBookingById,
};
