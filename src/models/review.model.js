import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    guestId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true },
    comment: { type: String, required: true, trim: true },
    images: [{ url: String, public_id: String }],
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.post("save", async function () {
  const stats = await mongoose.model("Review").aggregate([
    { $match: { hotelId: this.hotelId } },
    {
      $group: {
        _id: "$hotelId",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Hotel").findByIdAndUpdate(this.hotelId, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  }
});

export const Review = mongoose.model("Review", reviewSchema);
