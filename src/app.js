import "./env.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import bookingRouter from "./routes/booking.routes.js";
import hotelRouter from "./routes/hotel.routes.js";
import reviewRouter from "./routes/review.routes.js";
import userRouter from "./routes/user.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import aiRouter from "./routes/ai.routes.js";
import roomRouter from "./routes/room.routes.js";

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

app.use("/api/v1/users", userRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/hotels", hotelRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/nestiq", aiRouter);
app.use("/api/v1/rooms", roomRouter);

// 404 error
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
    success: false,
  });
});

// GLOBAL ERROR HANDLER - Catches all errors thrown in controllers.
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err?.message || "Internal Server Error";

  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${message}`);
  if (statusCode === 500) console.error(err?.stack);

  return res.status(statusCode).json({
    status: statusCode,
    message,
    success: false,
    ...(process.env.NODE_ENV === "development" && {
      stack: err?.stack,
    }),
  });
});

export default app;
