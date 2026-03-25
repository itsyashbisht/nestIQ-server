import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

export const verifyJWT = asyncHandler(async (req, _res, next) => {
  try {
    // console.log(req)
    console.log("cookies", req.cookies);

    const token =
      req.cookies?.accessToken ??
      req.header("authorization")?.replace("Bearer ", "");
    console.log(token);

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
      throw new ApiError(500, "ACCESS_TOKEN_SECRET is not configured");
    }

    const decodedToken = jwt.verify(token, accessTokenSecret);
    if (!decodedToken) throw new ApiError(401, "Invalid access token");

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      throw new ApiError(400, "User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid access token";
    throw new ApiError(401, message);
  }
});
