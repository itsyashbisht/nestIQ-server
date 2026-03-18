import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}`,
    );
    console.log(
      `Connected to MongoDB connection, DB host: ${connectionInstance.connection.host} `,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection failed:", error);
    } else {
      console.log(
        "Unknown error occured while connecting to MongoDB connection",
      );
    }
    process.exit(1);
  }
};

export default connectDB;
