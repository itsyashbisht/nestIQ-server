import "./env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";

const app = express();

// ENV validation
if (!process.env.CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN is not defined");
}

// MIDDLEWARES
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// HEALTH CHECK
app.get("/", (req, res) => {
  res.send("API is running...");
});

import bookingRouter from "./routes/booking.routes.js";
import hotelRouter from "./routes/hotel.routes.js";
import reviewRouter from "./routes/review.routes.js";
import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/hotels", hotelRouter);
app.use("/api/v1/reviews", reviewRouter);

export default app;
