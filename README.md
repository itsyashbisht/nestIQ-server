# NestIQ Server

Backend API for **NestIQ** — an India-focused hotel booking platform with AI-powered search, conversational concierge, and end-to-end reservation workflows.

Built with **Express.js**, **MongoDB**, **Groq AI**, **Cloudinary**, and **Razorpay**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [AI Capabilities](#ai-capabilities)
- [Payment Flow](#payment-flow)
- [Response Format](#response-format)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)

---

## Features

- **User management** — Registration, login, JWT-based sessions (httpOnly cookies), password reset, and profile updates
- **Role-based access** — `Guest`, `Owner`, and `Admin` roles with route-level enforcement
- **Hotel catalog** — CRUD operations, slug-based lookup, filtering, pagination, and image uploads via Cloudinary
- **Room management** — Multi-type rooms per hotel with availability toggling and image management
- **Bookings** — Multi-room reservations with GST calculation (12%), date validation, and status lifecycle
- **Payments** — Razorpay order creation and HMAC signature verification
- **Reviews** — Guest reviews with automatic hotel rating aggregation
- **AI search** — Natural-language hotel queries converted to structured MongoDB filters
- **Hotel chat** — Streaming AI concierge scoped to a single property and its rooms
- **Booking concierge** — Tool-calling AI agent that searches hotels, checks availability, prices bookings, and generates checkout links
- **Listing generator** — AI-assisted hotel listing creation for property owners
- **Database seeding** — 16 sample Indian hotels with generated room inventory

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcrypt |
| AI | Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) via Vercel AI SDK |
| File Storage | Cloudinary |
| Payments | Razorpay |
| Validation | Zod (AI structured outputs) |
| Dev Tools | Nodemon, Prettier |

---

## Architecture

```
Client (Web / Mobile)
        │
        ▼
   Express App (src/app.js)
        │
        ├── Middlewares ── CORS, cookie-parser, JWT auth, role guard, multer
        │
        ├── Routes (/api/v1/*)
        │     ├── users, hotels, rooms, bookings
        │     ├── reviews, payments, nestiq-ai
        │
        ├── Controllers ── Business logic (asyncHandler-wrapped)
        │
        ├── Models ── Mongoose schemas + hooks
        │
        └── Utils ── Cloudinary, Razorpay, Groq AI, API helpers
                │
                ▼
           MongoDB
```

All API routes are mounted under `/api/v1/`. A global error handler returns consistent JSON error responses, and unhandled routes receive a `404` payload.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** instance (local or Atlas)
- API keys for **Groq**, **Cloudinary**, and **Razorpay**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nestiq-server

# Install dependencies
npm install

# Create a .env file in the project root (see Environment Variables section)

# Seed the database (optional)
npm run seed

# Start development server
npm run dev
```

The server starts on **port 8000** by default. Verify with:

```bash
curl http://localhost:8000/
# → "API is running..."
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/nestiq

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

> `CORS_ORIGIN` is required at startup. Razorpay credentials are validated when the Razorpay utility module loads.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Nodemon (watches `src/`) |
| `npm run start` | Start production server |
| `npm run seed` | Seed database with 16 sample hotels and room types |

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

### Users — `/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | — | Register a new user |
| `POST` | `/login` | — | Login and receive tokens (httpOnly cookies) |
| `POST` | `/refresh-token` | — | Refresh access token |
| `POST` | `/forgot-password` | — | Request password reset token |
| `POST` | `/verify-reset-token` | — | Validate reset token |
| `POST` | `/reset-password/:token` | — | Reset password |
| `GET` | `/logout` | JWT | Logout and clear cookies |
| `GET` | `/me` | JWT | Get current user profile |
| `PATCH` | `/update-details` | JWT | Update profile details |
| `PATCH` | `/change-password` | JWT | Change password |
| `PATCH` | `/set-owner` | JWT | Upgrade role to Owner |
| `GET` | `/users` | Admin | List all users |

### Hotels — `/hotels`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/all` | — | List hotels (filter, sort, paginate) |
| `POST` | `/search` | — | AI-powered natural language search |
| `POST` | `/create` | Owner, Admin | Create hotel with images |
| `GET` | `/slug/:slug` | — | Get hotel by slug |
| `GET` | `/:hotelId` | — | Get hotel by ID |
| `PATCH` | `/:hotelId` | Owner, Admin | Update hotel |
| `DELETE` | `/:hotelId` | Owner, Admin | Delete hotel |

**Query parameters for `/all`:** `city`, `category`, `vibe`, `minPrice`, `maxPrice`, `sortBy` (`rating` | `price_asc` | `price_desc` | `newest`), `page`, `limit`

### Rooms — `/rooms`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/create` | Admin | Create room with images |
| `GET` | `/:roomId` | — | Get room by ID |
| `GET` | `/hotel/:hotelId` | — | List rooms for a hotel |
| `PATCH` | `/update/:roomId` | Admin | Update room details |
| `DELETE` | `/delete/:roomId` | Admin, Owner | Delete room |
| `PUT` | `/:roomId/toggle-room-availability` | Owner | Toggle room availability |
| `POST` | `/:roomId/add-images` | Admin | Upload additional room images |
| `DELETE` | `/:roomId/remove-images` | Admin | Remove room images |

### Bookings — `/bookings`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/new` | JWT | Create booking and Razorpay order |
| `GET` | `/my-bookings` | JWT | Get current user's bookings |
| `GET` | `/bookings` | Admin | List all bookings |
| `GET` | `/:bookingId` | JWT | Get booking by ID |
| `PATCH` | `/:bookingId/cancel` | JWT | Cancel a booking |
| `PATCH` | `/:bookingId/status` | Admin | Update booking status |

### Reviews — `/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/hotel/:hotelId` | — | Get reviews for a hotel |
| `POST` | `/hotel/:hotelId` | JWT | Add a review |
| `DELETE` | `/:reviewId` | JWT | Remove a review |

### Payments — `/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/razorpayKey` | JWT | Get Razorpay public key |
| `POST` | `/verify` | JWT | Verify Razorpay payment signature |

### AI — `/nestiq-ai`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat` | — | Streaming hotel-specific AI chat |
| `POST` | `/concierge` | — | AI booking concierge with tool calling |
| `POST` | `/listing` | JWT | Generate hotel listing from description |

---

## Authentication & Authorization

### JWT Sessions

- Access and refresh tokens are issued on login/register and stored as **httpOnly cookies** (`secure`, `sameSite: none`)
- Protected routes accept tokens via cookies **or** `Authorization: Bearer <token>` header
- Refresh tokens are rotated on `/users/refresh-token`

### Roles

| Role | Capabilities |
|------|-------------|
| **Guest** | Browse, book, review, manage own profile and bookings |
| **Owner** | Manage owned hotels, toggle room availability, upgrade from Guest |
| **Admin** | Full platform access including user listing and booking management |

Password reset tokens expire after **15 minutes** and are stored as SHA-256 hashes.

---

## AI Capabilities

### Natural Language Search (`POST /hotels/search`)

Converts free-text queries into structured filters (city, category, vibe, price range) using Groq structured output, then queries MongoDB and returns matching hotels with an AI-generated insight.

### Hotel Chat (`POST /nestiq-ai/chat`)

Streams a property-scoped concierge response. The model receives full hotel and room context and answers only about that property. Response is `text/plain` with chunked transfer encoding.

### Booking Concierge (`POST /nestiq-ai/concierge`)

A multi-step, tool-calling agent that orchestrates:

1. Hotel search by city/vibe/category
2. Room listing for a selected property
3. Availability checks with date overlap detection
4. Price calculation with 12% GST
5. Checkout link generation

### Listing Generator (`POST /nestiq-ai/listing`)

Generates structured hotel listing content (name, category, description, vibes, amenities, SEO fields) from a free-text property description. Requires authentication.

---

## Payment Flow

1. **Create booking** — `POST /bookings/new` validates rooms, calculates pricing (subtotal + 12% GST), creates a `pending` booking, and creates a Razorpay order
2. **Client checkout** — Frontend uses the Razorpay key from `GET /payments/razorpayKey` to complete payment
3. **Verify payment** — `POST /payments/verify` validates the HMAC signature, marks the payment as `paid`, and confirms the booking

Booking statuses: `pending` → `confirmed` → `completed` | `cancelled`

---

## Response Format

### Success

```json
{
  "statusCode": 200,
  "data": { },
  "message": "Success message",
  "success": true
}
```

### Error

```json
{
  "status": 400,
  "message": "Error description",
  "success": false
}
```

In development mode (`NODE_ENV=development`), error responses may include a `stack` trace.

---

## Project Structure

```
src/
├── app.js                  # Express app, middleware, route mounting
├── index.js                # Server entry point
├── env.js                  # dotenv configuration
├── seed.js                 # Database seeder
├── constants/              # Shared constants
├── controllers/            # Route handlers
│   ├── user.controllers.js
│   ├── hotel.controllers.js
│   ├── room.controllers.js
│   ├── booking.controllers.js
│   ├── review.controllers.js
│   ├── payment.controllers.js
│   ├── ai.controllers.js
│   └── concierge.controllers.js
├── db/
│   └── index.js            # MongoDB connection
├── middlewares/
│   ├── auth.middleware.js  # JWT verification
│   ├── role.middleware.js  # Role-based access control
│   └── multer.middleware.js
├── models/
│   ├── user.model.js
│   ├── hotel.model.js
│   ├── room.model.js
│   ├── booking.model.js
│   ├── review.model.js
│   └── payment.model.js
├── routes/                 # Express routers
└── utils/
    ├── apiError.js
    ├── apiResponse.js
    ├── asyncHandler.js
    ├── cloudinary.js
    ├── groqAI.js
    ├── razorpay.js
    └── conciergeMarker.js
```

---

## Development Notes

- **ES Modules** — The project uses `"type": "module"`; use `import`/`export` syntax throughout
- **Async handling** — All controllers are wrapped with `asyncHandler` to forward errors to the global handler
- **Image uploads** — Multer writes to `./public/temp` before Cloudinary upload; ensure this directory exists
- **Hotel categories** — `budget`, `comfort`, `luxury`, `boutique`
- **Travel vibes** — `romantic`, `family`, `adventure`, `business`, `solo`, `wellness`
- **Room types** — `standard`, `deluxe`, `suite`, `villa`, `dormitory`
- **CORS** — Configured with `credentials: true` for cookie-based auth from the frontend

---

## License

ISC
