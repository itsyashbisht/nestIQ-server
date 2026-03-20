import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room" },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true },
    guests: { type: Number, required: true, default: 1 },
    pricePerNight: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    taxes: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    specialRequests: { type: String, default: "" },
  },
  { timestamps: true },
);

bookingSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut) {
    const ms =
      new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime();
    this.nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  }
  next();
});

export const Booking = mongoose.model("Booking", bookingSchema);
