import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },

    // Razorpay IDs
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    razorpaySignature: {
      type: String,
      default: "",
    },

    // Amount stored in INR (not paise)
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },

    // Status lifecycle
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    recipt: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },

    // Payment method Razorpay returns after payment
    method: {
      type: String,
      enum: ["card", "netBanking", "upi", "wallet", "emi", ""],
      default: "",
    },

    // Refund (populated if booking cancelled post-payment)
    refundId: { type: String, default: "" },
    refundAmount: { type: Number, default: 0 },
    refundedAt: { type: Date },
  },
  { timestamps: true },
);

export const Payment = mongoose.model("Payment", paymentSchema);
