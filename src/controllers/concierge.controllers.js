import mongoose from "mongoose";
import { Groq } from "groq-sdk";
import { ApiError } from "../utils/apiError.js";
import { Booking, Hotel, Room } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { injectBookingLinkMarker, injectHotelsMarker, injectRoomsMarker } from "../utils/conciergeMarker.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateDates(checkIn, checkOut) {
  const i = new Date(checkIn);
  const o = new Date(checkOut);
  if (isNaN(i.getTime()) || isNaN(o.getTime()))
    return "Invalid dates. Use YYYY-MM-DD.";
  if (o <= i) return "Check-out must be after check-in.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (i < today) return "Check-in cannot be in the past.";
  return null;
}

// ─── Tool implementations ─────────────────────────────────────────────────────
async function searchHotelsImpl({ city, vibe, category, maxPrice }) {
  const filter = { isActive: true, city: { $regex: city, $options: "i" } };
  if (vibe) filter.vibes = { $in: [vibe] };
  if (category) filter.category = category;
  if (maxPrice) filter.startingFrom = { $lte: maxPrice };

  const hotels = await Hotel.find(filter)
    .select("_id name slug city category vibes startingFrom rating")
    .sort({ rating: -1 })
    .limit(4)
    .lean();

  if (!hotels.length)
    return JSON.stringify({
      found: false,
      message: `No hotels found in ${city}.`,
    });

  return JSON.stringify({
    found: true,
    hotels: hotels.map((h) => ({
      _id: h._id.toString(),
      name: h.name,
      slug: h.slug,
      city: h.city,
      category: h.category,
      vibes: h.vibes,
      startingFrom: h.startingFrom,
      rating: h.rating,
    })),
  });
}

async function getRoomsImpl({ hotelId, hotelName, hotelSlug }) {
  try {
    const rooms = await Room.find({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      isAvailable: true,
    })
      .select("_id name type pricePerNight maxGuests amenities")
      .sort({ pricePerNight: 1 })
      .lean();

    if (!rooms.length)
      return JSON.stringify({
        found: false,
        message: `No available rooms at ${hotelName}.`,
      });

    return JSON.stringify({
      found: true,
      hotelName,
      hotelSlug,
      rooms: rooms.map((r) => ({
        _id: r._id.toString(),
        name: r.name,
        type: r.type,
        pricePerNight: r.pricePerNight,
        maxGuests: r.maxGuests,
        amenities: r.amenities,
      })),
    });
  } catch (err) {
    return JSON.stringify({ found: false, message: err.message });
  }
}

async function checkRoomAvailabilityImpl({
  roomId,
  checkIn,
  checkOut,
  guests,
}) {
  try {
    const dateErr = validateDates(checkIn, checkOut);
    if (dateErr) return JSON.stringify({ available: false, message: dateErr });

    const room = await Room.findById(roomId)
      .select("name pricePerNight maxGuests hotelId")
      .lean();
    if (!room)
      return JSON.stringify({ available: false, message: "Room not found." });

    // Capacity issue — return alternatives
    if (guests > room.maxGuests) {
      const alts = await Room.find({
        hotelId: room.hotelId,
        isAvailable: true,
        maxGuests: { $gte: guests },
      })
        .select("_id name type pricePerNight maxGuests amenities")
        .sort({ pricePerNight: 1 })
        .lean();

      return JSON.stringify({
        available: false,
        guestCapacityIssue: true,
        requestedGuests: guests,
        roomMaxGuests: room.maxGuests,
        alternatives: alts.map((r) => ({
          _id: r._id.toString(),
          name: r.name,
          type: r.type,
          pricePerNight: r.pricePerNight,
          maxGuests: r.maxGuests,
          amenities: r.amenities,
        })),
      });
    }

    const overlap = await Booking.findOne({
      "rooms.roomId": new mongoose.Types.ObjectId(roomId),
      status: { $nin: ["cancelled"] },
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    });

    if (overlap)
      return JSON.stringify({
        available: false,
        message: "Room is booked for those dates. Try different dates.",
      });

    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / 86400000,
    );
    return JSON.stringify({
      available: true,
      nights,
      room: {
        _id: room._id.toString(),
        name: room.name,
        pricePerNight: room.pricePerNight,
        maxGuests: room.maxGuests,
      },
    });
  } catch (err) {
    return JSON.stringify({ available: false, message: err.message });
  }
}

async function calculateBookingPriceImpl({
  roomId,
  checkIn,
  checkOut,
  guests,
}) {
  try {
    const room = await Room.findById(roomId)
      .select("pricePerNight name")
      .lean();
    if (!room)
      return JSON.stringify({ calculated: false, message: "Room not found." });

    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / 86400000,
    );
    const base = room.pricePerNight * nights;
    const tax = Math.round(base * 0.12);
    const total = base + tax;

    return JSON.stringify({
      calculated: true,
      nights,
      roomName: room.name,
      breakdown: [
        `🏨 Room (${nights}N × ₹${room.pricePerNight.toLocaleString("en-IN")}): ₹${base.toLocaleString("en-IN")}`,
        `📊 GST (12%): ₹${tax.toLocaleString("en-IN")}`,
        `💰 Total: ₹${total.toLocaleString("en-IN")}`,
        `👤 Per person: ₹${Math.round(total / guests).toLocaleString("en-IN")}`,
      ].join("\n"),
      summary: {
        baseAmount: base,
        taxAmount: tax,
        gstRate: 12,
        totalAmount: total,
        currency: "INR",
      },
    });
  } catch (err) {
    return JSON.stringify({ calculated: false, message: err.message });
  }
}

function generateBookingLinkImpl({
  hotelSlug,
  roomId,
  roomName,
  pricePerNight,
  checkIn,
  checkOut,
  guestCount,
}) {
  const missing = [
    "hotelSlug",
    "roomId",
    "roomName",
    "pricePerNight",
    "checkIn",
    "checkOut",
    "guestCount",
  ].filter(
    (k) =>
      !{
        hotelSlug,
        roomId,
        roomName,
        pricePerNight,
        checkIn,
        checkOut,
        guestCount,
      }[k],
  );
  if (missing.length)
    return JSON.stringify({
      generated: false,
      message: `Missing: ${missing.join(", ")}`,
    });

  const e = validateDates(checkIn, checkOut);
  if (e) return JSON.stringify({ generated: false, message: e });

  const p = new URLSearchParams({
    roomId,
    roomName,
    pricePerNight: String(pricePerNight),
    checkIn,
    checkOut,
    guests: String(guestCount),
  });
  return JSON.stringify({
    generated: true,
    link: `/hotels/${hotelSlug}/book?${p.toString()}`,
  });
}

const TOOLS = {
  searchHotels: searchHotelsImpl,
  getRooms: getRoomsImpl,
  checkRoomAvailability: checkRoomAvailabilityImpl,
  calculateBookingPrice: calculateBookingPriceImpl,
  generateBookingLink: generateBookingLinkImpl,
};

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are NestIQ's hotel booking concierge for India.

STRICT FLOW — 6 steps, each waits for user input before moving to the next:

STEP 1 — SEARCH
When: user asks for hotels or mentions a city.
Do: call searchHotels.
Say after: "Here are some great options in [city]!" — do NOT list hotels in text, the UI displays them automatically.
Wait for user to pick a hotel.

STEP 2 — ROOMS
When: user mentions a specific hotel name or says they like one.
Do: call getRooms.
Say after: "Here are the available rooms!" — do NOT list rooms in text, the UI displays them automatically.
⛔ DO NOT ask for dates. DO NOT ask for guests. JUST STOP and wait.

STEP 3 — ASK FOR DATES AND GUESTS
When: user explicitly selects a room by name or says "I want this room" / "book this" / "I'll take the [room name]".
Do: NO tool call. The rooms are already displayed — DO NOT call getRooms again, DO NOT list rooms again.
Say exactly:
"Please share your booking details:
• Check-in date (YYYY-MM-DD)
• Check-out date (YYYY-MM-DD)
• Number of guests"
Wait for user reply.

STEP 4 — CHECK AVAILABILITY
When: user provides all 3 — check-in, check-out, and guest count.
Do: call checkRoomAvailability.

  → If guestCapacityIssue = true:
    Tell user the capacity. List alternatives by name and price.
    Ask them to choose a different room → back to STEP 3.

  → If available = false (dates clash):
    Tell user those dates are unavailable. Ask for new dates → back to STEP 3.

  → If available = true:
    Immediately call calculateBookingPrice (same reply, no pause).

STEP 5 — PRICING (auto-chained)
When: calculateBookingPrice returns calculated = true.
Do: show the price breakdown in plain text.
Then immediately call generateBookingLink (same reply, no pause).

STEP 6 — BOOKING LINK (auto-chained)
When: generateBookingLink returns generated = true.
Do: say "Your booking link is ready! Tap below to complete your reservation."
The link button appears automatically — do NOT write the URL in your message.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ NEVER ask for dates or guests before the user has selected a room (STEP 2 → just wait).
⛔ NEVER call checkRoomAvailability unless you have roomId + checkIn + checkOut + guests.
⛔ NEVER call calculateBookingPrice before checkRoomAvailability confirms available=true.
⛔ NEVER call generateBookingLink before calculateBookingPrice confirms calculated=true.
✅ STEPS 4→5→6 must all happen in one reply once triggered.
✅ Keep replies short and friendly.
✅ Never invent prices, room names, or hotel data.`;

// ─── Tool definitions ─────────────────────────────────────────────────────────
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "searchHotels",
      description:
        "Search hotels by city, travel vibe, category, max price. Call when user asks for hotel recommendations or mentions a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City in India" },
          vibe: {
            type: "string",
            enum: [
              "romantic",
              "family",
              "adventure",
              "business",
              "solo",
              "wellness",
            ],
          },
          category: {
            type: "string",
            enum: ["budget", "comfort", "luxury", "boutique"],
          },
          maxPrice: { type: "number", description: "Max price per night INR" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRooms",
      description:
        "Fetch available rooms for a hotel. Call ONLY when user has explicitly chosen a specific hotel by name. Do NOT call this automatically after searchHotels.",
      parameters: {
        type: "object",
        properties: {
          hotelId: {
            type: "string",
            description: "Hotel _id from search results",
          },
          hotelName: { type: "string", description: "Hotel display name" },
          hotelSlug: { type: "string", description: "Hotel slug" },
        },
        required: ["hotelId", "hotelName", "hotelSlug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkRoomAvailability",
      description:
        "Check if a room is available. ONLY call this after: (1) user has selected a specific room, (2) user has provided check-in date, check-out date, AND guest count. Missing any of these = do NOT call.",
      parameters: {
        type: "object",
        properties: {
          roomId: { type: "string", description: "Room _id" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
          guests: { type: "number", description: "Guest count" },
        },
        required: ["roomId", "checkIn", "checkOut", "guests"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateBookingPrice",
      description:
        "Calculate total price with GST. ONLY call after checkRoomAvailability returns available=true.",
      parameters: {
        type: "object",
        properties: {
          roomId: { type: "string" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
          guests: { type: "number" },
        },
        required: ["roomId", "checkIn", "checkOut", "guests"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateBookingLink",
      description:
        "Generate the checkout URL. ONLY call after calculateBookingPrice returns calculated=true.",
      parameters: {
        type: "object",
        properties: {
          hotelSlug: { type: "string" },
          roomId: { type: "string" },
          roomName: { type: "string" },
          pricePerNight: { type: "number" },
          checkIn: { type: "string", description: "YYYY-MM-DD" },
          checkOut: { type: "string", description: "YYYY-MM-DD" },
          guestCount: { type: "number" },
        },
        required: [
          "hotelSlug",
          "roomId",
          "roomName",
          "pricePerNight",
          "checkIn",
          "checkOut",
          "guestCount",
        ],
      },
    },
  },
];

// ─── Controller ───────────────────────────────────────────────────────────────
const concierge = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!messages?.length) throw new ApiError(400, "messages are required!");

  const conversation = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  let hotelResults = null;
  let roomResults = null;
  let bookingLinkResult = null;

  // AI returns content + tool_calls in the same message turn
  let finalResponse = "";
  const MAX_ITER = 8;

  try {
    for (let iter = 0; iter < MAX_ITER; iter++) {
      const resp = await groq.chat.completions.create({
        model: MODEL,
        messages: conversation,
        tools: toolDefinitions,
        tool_choice: "auto",
        temperature: 0.3,
        max_completion_tokens: 1024,
      });

      const msg = resp.choices[0].message;
      conversation.push(msg);

      // BUG FIX: capture text content on EVERY turn, not only on break.
      // Some models return text + tool_calls in the same message.
      // We want the last non-empty text the AI produced.
      if (msg.content?.trim()) finalResponse = msg.content.trim();

      // No tool calls → done
      if (!msg.tool_calls?.length) break;

      // Execute tools
      for (const call of msg.tool_calls) {
        const fn = call.function.name;
        const args = JSON.parse(call.function.arguments);
        const impl = TOOLS[fn];

        if (!impl) {
          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            name: fn,
            content: JSON.stringify({ error: `Unknown: ${fn}` }),
          });
          continue;
        }

        const raw = await impl(args);
        const parsed = JSON.parse(raw);

        if (fn === "searchHotels" && parsed.found) hotelResults = parsed.hotels;
        if (fn === "getRooms" && parsed.found)
          roomResults = {
            rooms: parsed.rooms,
            hotelName: parsed.hotelName,
            hotelSlug: parsed.hotelSlug,
          };
        if (fn === "generateBookingLink" && parsed.generated)
          bookingLinkResult = parsed.link;

        conversation.push({
          role: "tool",
          tool_call_id: call.id,
          name: fn,
          content: raw,
        });
      }
    }

    // Inject markers — each appended after the AI's text
    if (hotelResults?.length)
      finalResponse = injectHotelsMarker(finalResponse, hotelResults);

    if (roomResults)
      finalResponse = injectRoomsMarker(
        finalResponse,
        roomResults.rooms,
        roomResults.hotelName,
        roomResults.hotelSlug,
      );

    if (bookingLinkResult)
      finalResponse = injectBookingLinkMarker(finalResponse, bookingLinkResult);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.write(finalResponse);
    res.end();
  } catch (err) {
    console.error("❌ Concierge error:", err.message);
    throw err;
  }
});

export { concierge };
