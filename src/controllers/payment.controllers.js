import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Booking, Payment } from "../models/index.js";

const getRazorpayKey = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { key: process.env.RAZORPAY_KEY },
        "Razorpay key fetched successfully",
      ),
    );
});

const verifyPayment = asyncHandler(async (req, res) => {
  // Auth + fields validations
  const guestId = req.user?._id;
  if (!guestId) throw new ApiError(401, "Unauthorized!");

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  } = req.body;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !bookingId
  ) {
    throw new ApiError(400, "All payment fields are required!");
  }

  // Validate booking ownership + state
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found!");

  if (booking.guestId.toString() !== guestId.toString()) {
    throw new ApiError(403, "You are not allowed to verify this payment!");
  }

  if (booking.status !== "pending") {
    throw new ApiError(400, `Booking is already ${booking.status}!`);
  }

  // Recomute HMAC signature
  const body = `${razorpay_payment_id}|${razorpay_signature}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body)
    .digest("hex");

  // Compare signatures
  if (expectedSignature !== razorpay_signature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          status: "failed",
          razorpayPaymentId: razorpay_payment_id,
        },
      },
    );

    throw new ApiError(400, "Payment verification failed - invalid signature!");
  }

  // Mark Payment as paid
  await Payment.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      $set: {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        method: "upi",
      },
    },
  );

  // confirm the booking
  const confirmedBooking = await Booking.findByIdAndUpdate(
    bookingId,
    {
      $set: {
        status: "confirmed",
        razorpayOrderId: razorpay_order_id,
      },
    },
    {
      new: true,
    },
  ).populate("hotelId", "name city images");
  if (!confirmedBooking)
    throw new ApiError(404, "Booking not found during confirmation!");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        verified: true,
        booking: confirmedBooking,
      },
      "Payment verified and booking confirmed!",
    ),
  );
});

export { getRazorpayKey, verifyPayment };
