import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IReview extends Document {
  guestId: Types.ObjectId;
  hotelId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images: { url: string; public_id: string }[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
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

// Auto-update hotel avg rating after each review saved
reviewSchema.post("save", async function () {
  const stats = await mongoose.model<IReview>("Review").aggregate([
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

export const Review: Model<IReview> = mongoose.model<IReview>(
  "Review",
  reviewSchema,
);
