import mongoose, { Schema } from "mongoose";

const bookedRoomSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    pricePerNight: { type: Number, required: true }, // snapshot at booking time
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false },
); // no separate _id for subdocuments

const bookingSchema = new Schema(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    rooms: {
      type: [bookedRoomSchema],
      required: true,
    }, // ← multi-room
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    nights: {
      type: Number,
      default: 0,
    },
    guests: {
      type: Number,
      required: true,
      default: 1,
    },
    // Pricing — no pricePerNight at top level, it's per room now
    subtotal: {
      type: Number,
      required: true,
    },
    taxes: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    razorpayOrderId: { type: String, default: "" },
    specialRequests: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Booking = mongoose.model("Booking", bookingSchema);
