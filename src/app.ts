import cors from "cors";
import "./env.ts";
import cookieParser from "cookie-parser";
import express, { Application } from "express";

const app: Application = express();

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

export default app;
