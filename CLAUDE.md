# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestIQ is a hotel booking platform backend for India with AI-powered search, chat, and budget planning features. Built with Express.js, MongoDB/Mongoose, and integrates Groq AI, Cloudinary (image storage), and Razorpay (payments).

## Commands

```bash
npm run dev        # Start dev server with nodemon (port 8000)
npm run start      # Start production server
npm run seed       # Seed database with 12 sample hotels and room types
```

## Architecture

### Core Stack
- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express.js with global error handling
- **Database**: MongoDB via Mongoose
- **AI**: Groq SDK with `ai` package (Vercel AI SDK) for streaming/object generation
- **Storage**: Cloudinary for image uploads
- **Payments**: Razorpay integration

### Directory Structure
```
src/
├── controllers/    # Request handlers (asyncHandler wrapped)
├── models/         # Mongoose schemas + model exports
├── routes/         # Express routers
├── middlewares/    # auth (JWT), role-based access, multer upload
├── utils/          # Cloudinary, Razorpay, Groq AI, error/response helpers
├── db/             # Database connection
├── app.js          # Express app setup + route mounting
└── index.js        # Server entry point
```

### API Routes (all under `/api/v1/`)
- `/users` - Authentication, profile management, password reset
- `/hotels` - CRUD, AI-powered search
- `/rooms` - Room management per hotel
- `/bookings` - Create, view, cancel bookings
- `/reviews` - Hotel reviews
- `/payments` - Razorpay integration
- `/nestiq` - AI features (chat, budget planner, concierge, listing generator)

### Authentication Flow
- JWT-based with access + refresh tokens stored in httpOnly cookies
- `verifyJWT` middleware protects routes
- `authorizeRoles` middleware enforces role-based access (Guest, Admin, Owner)
- Password reset via token (15-min expiry, SHA256 hashed)

### Key Patterns
- **asyncHandler**: Wraps all controllers to catch promise rejections
- **ApiError/ApiResponse**: Standardized error/response classes
- **Pre-save hooks**: Mongoose hooks for password hashing
- **Streaming AI responses**: `streamText` for chat, `generateObject` for structured data

### Environment Variables Required
```
MONGODB_URI
CORS_ORIGIN
ACCESS_TOKEN_SECRET / REFRESH_TOKEN_SECRET
ACCESS_TOKEN_EXPIRY / REFRESH_TOKEN_EXPIRY
GROQ_API_KEY
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
PORT (default: 8000)
```
