import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["standard", "deluxe", "suite", "villa", "dormitory"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        url: String,
        public_id: String,
      },
    ],
    bedType: {
      type: String,
      enum: ["single", "double", "king", "twin"],
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
    },
    maxGuests: {
      type: Number,
      required: true,
      default: 2,
    },
    amenities: [
      {
        type: String,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

export const Room = mongoose.model("Room", roomSchema);
