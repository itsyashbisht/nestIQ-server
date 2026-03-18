import connectDB from "./db";
import app from "./app";

const PORT = process.env.PORT || 8000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.on("error", (error: Error) => {
      console.error("Server Error: " + error);
      throw error;
    });

    app.listen(PORT, (): void => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("MongoDB connection failed! " + error);
    } else {
      console.error("Unknown error during sever startup");
    }
    process.exit(1);
  }
};

startServer();
