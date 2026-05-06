import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import crypto from "crypto";

const options = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(403, "User not found!");

    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refreshToken",
    );
  }
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized user");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken._id);
    if (!user) throw new ApiError(400, "User not found");

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(403, "Refresh token has expired!");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        200,
        { accessToken: accessToken, refreshToken: newRefreshToken },
        "Access Token refreshed successfully",
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    username,
    fullname,
    phoneNumber,
    address,
    city,
    state,
    pincode,
    role = "Guest",
  } = req.body;
  if (
    !email ||
    !password ||
    !username ||
    !fullname ||
    !phoneNumber ||
    !address ||
    !city ||
    !state ||
    !pincode ||
    !role
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const existedUser = await User.findOne({ email });
  if (existedUser) throw new ApiError(400, "User already exists!");

  const user = await User.create({
    email,
    fullname,
    password,
    username,
    phoneNumber,
    address,
    city,
    state,
    pincode,
    role,
  });
  if (!user) throw new ApiError(401, "Failed to create user.!");

  return res
    .status(201)
    .json(new ApiResponse(201, user, "Successfully registered!"));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new ApiError(401, "Invalid email or password!");

  const existedUser = await User.findOne({ email });
  if (!existedUser) throw new ApiError(400, "User doesn't exist!");

  const isPasswordValid = await existedUser.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid user password!");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existedUser._id,
  );

  const loggedInUser = await User.findOne({ email }).select(
    "-password -refreshToken",
  );
  if (!loggedInUser) throw new ApiError(401, "Failed to login!");

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        "Successfully logged in!",
      ),
    );
});

const logout = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) throw new ApiError(401, "Unauthorized!");

  await User.findByIdAndUpdate(
    id,
    { $unset: { refreshToken: 1 } },
    { new: true },
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "Successfully logged out!"));
});

const getMe = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) throw new ApiError(401, "Unauthorized!");

  const user = await User.findById(id).select("-password -refreshToken");
  if (!user) throw new ApiError(404, "User not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully!"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const id = req?.user?._id;
  if (!id) throw new ApiError(400, "User doesn't exist!");
  const allowedUpdates = [
    "username",
    "fullname",
    "phoneNumber",
    "address",
    "city",
    "state",
    "pincode",
  ];

  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      $set: updates,
    },
    { new: true },
  ).select("-password -refreshToken");
  if (!updatedUser) throw new ApiError(401, "Failed to update");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Successfully updated user!"));
});

const updateRoleToOwner = asyncHandler(async (req, res) => {
  const id = req?.user?._id;
  if (!id) throw new ApiError(400, "User doesn't exist!");

  const user = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        role: "Owner",
      },
    },
    {
      new: true,
    },
  ).select("-password -refreshToken");
  if (!user) throw new ApiError(401, "Failed to update role!");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Successfully updated role to owner!"));
});

const changePassword = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) throw new ApiError(401, "Unauthorized!");

  const { curPassword, newPassword } = req.body;
  if (!curPassword || !newPassword) {
    throw new ApiError(400, "Current and new password are required!");
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found!");

  const isPasswordValid = await user.isPasswordCorrect(curPassword);
  if (!isPasswordValid)
    throw new ApiError(401, "Current password is incorrect!");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully!"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required!");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User doesn't exist!");

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        resetToken,
        expiresAt: user.resetPasswordExpires,
      },
      "Password reset token generated successfully!",
    ),
  );
});

const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(401, "Token is required!");

  // Hash the incoming token to compare with stored hashed token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired reset token!");

  return res
    .status(200)
    .json(new ApiResponse(200, { valid: true }, "Token is valid!"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) throw new ApiError(400, "Reset token is required!");
  if (!newPassword) throw new ApiError(400, "New password is required!");
  if (newPassword.length < 8)
    throw new ApiError(400, "Password must be at least 8 characters!");

  // Hash the incoming token to compare with stored hashed token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired reset token!");

  // Set new password — bcrypt pre-save hook will hash it
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = null;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully!"));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully!"));
});

export {
  changePassword,
  getAllUsers,
  getMe,
  forgotPassword,
  login,
  logout,
  verifyResetToken,
  resetPassword,
  refreshAccessToken,
  register,
  updateRoleToOwner,
  updateUserDetails,
};
