import mongoose, { Schema } from "mongoose";

const hotelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    category: {
      type: String,
      enum: ["budget", "comfort", "luxury", "boutique"],
      required: true,
    },
    vibes: [
      {
        type: String,
        enum: [
          "romantic",
          "family",
          "adventure",
          "business",
          "solo",
          "wellness",
        ],
      },
    ],
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    amenities: [{ type: String }],
    pricePerNight: { type: Number, required: true },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    nearbyAttractions: [{ type: String }],
    checkInTime: { type: String, default: "14:00" },
    checkOutTime: { type: String, default: "11:00" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Hotel = mongoose.model("Hotel", hotelSchema);
