import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type HotelCategory = "budget" | "comfort" | "luxury" | "boutique";
export type HotelVibe =
  | "romantic"
  | "family"
  | "adventure"
  | "business"
  | "solo"
  | "wellness";

export interface IHotel extends Document {
  name: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  address: string;
  category: HotelCategory;
  vibes: HotelVibe[];
  images: { url: string; public_id: string }[];
  amenities: string[];
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  nearbyAttractions: string[];
  checkInTime: string;
  checkOutTime: string;
  ownerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hotelSchema = new Schema<IHotel>(
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

export const Hotel: Model<IHotel> = mongoose.model<IHotel>(
  "Hotel",
  hotelSchema,
);
