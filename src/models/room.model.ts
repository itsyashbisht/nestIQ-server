import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type RoomType = "standard" | "deluxe" | "suite" | "villa" | "dormitory";

export interface IRoom extends Document {
  hotelId: Types.ObjectId;
  name: string;
  type: RoomType;
  description: string;
  images: { url: string; public_id: string }[];
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  isAvailable: boolean;
  totalRooms: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["standard", "deluxe", "suite", "villa", "dormitory"],
      required: true,
    },
    description: { type: String, required: true },
    images: [{ url: String, public_id: String }],
    pricePerNight: { type: Number, required: true },
    maxGuests: { type: Number, required: true, default: 2 },
    amenities: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    totalRooms: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const Room: Model<IRoom> = mongoose.model<IRoom>("Room", roomSchema);
