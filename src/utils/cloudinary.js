import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader
      .upload(localFilePath, {
        resource_type: "auto",
      })
      .catch((err) => {
        console.log(err);
      });

    // File has been uploaded and removed locally.
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    throw new Error("Failed to delete image from Cloudinary");
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
