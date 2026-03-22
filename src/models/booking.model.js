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
    nights: { type: Number, default: 0 }, // ← set by pre("save") hook
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

    razorpayOrderId: { type: String, default: "" },
    specialRequests: { type: String, default: "" },
    // ✅ NO payment field — virtual handles it
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

// ✅ Virtual — populate payment without a stored ref
bookingSchema.virtual("paymentInfo", {
  ref: "Payment",
  localField: "_id",
  foreignField: "bookingId",
  justOne: true,
});

bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

export const Booking = mongoose.model("Booking", bookingSchema);
