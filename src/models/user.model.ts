import mongoose, { Document, Model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  username: string;
  fullname: string;
  email: string;
  phoneNumber: number;
  password: string;
  address: string;
  city: string;
  state: string;
  pincode: number;
  role: "Guest" | "Owner" | "Admin";
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    pincode: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ["Guest", "Admin", "Owner"],
      default: "Guest",
    },
    refreshToken: { type: String },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.isPasswordCorrect = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isPasswordCorrect("password")) {
    // @ts-ignore
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  // @ts-ignore
  next();
});

userSchema.methods.generateAccessToken = async function () {
  // @ts-ignore
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_SECRET as string,
    },
  );
};

userSchema.methods.generateRefreshToken = function () {
  // @ts-ignore
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY as string },
  );
};

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
