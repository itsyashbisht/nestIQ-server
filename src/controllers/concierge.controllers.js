import mongoose from "mongoose";
import { Groq } from "groq-sdk";
import { ApiError } from "../utils/apiError.js";
import { Hotel, Room } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { injectHotelsMarker, injectRoomsMarker } from "../utils/conciergeMarker.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

async function searchHotelsImpl({ city, vibe, category, maxPrice }) {
  const filter = {
    isActive: true,
    city: { $regex: city, $options: "i" },
  };

  if (vibe) filter.vibes = { $in: [vibe] };
  if (category) filter.category = category;
  if (maxPrice) filter.startingFrom = { $lte: maxPrice };

  const hotels = await Hotel.find(filter)
    .select("_id name slug city category vibes startingFrom rating amenities")
    .sort({ rating: -1 })
    .limit(4)
    .lean();

  if (!hotels.length) {
    return JSON.stringify({
      found: false,
      message: `No hotels found in ${city} with those filters.`,
    });
  }

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
    const objectId = new mongoose.Types.ObjectId(hotelId);
    const rooms = await Room.find({ hotelId: objectId, isAvailable: true })
      .select("_id name type pricePerNight maxGuests amenities")
      .sort({ pricePerNight: 1 })
      .lean();

    if (!rooms.length) {
      return JSON.stringify({
        found: false,
        message: `No available rooms at ${hotelName} right now.`,
      });
    }

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
        bookingLink: `/hotels/${hotelSlug}?roomId=${r._id}`,
      })),
    });
  } catch (error) {
    console.error("Error in getRooms:", error);
    return JSON.stringify({
      found: false,
      message: `Error fetching rooms: ${error.message}`,
    });
  }
}

function estimateBudgetImpl({
  city,
  nights,
  guests,
  pricePerNight,
  hotelCategory,
}) {
  console.log("💰 estimateBudget CALLED with:", {
    city,
    nights,
    guests,
    pricePerNight,
    hotelCategory,
  });

  const CITY_DATA = {
    mumbai: { food: 1600, local: 900, activities: 700 },
    delhi: { food: 1400, local: 800, activities: 800 },
    bangalore: { food: 1500, local: 850, activities: 500 },
    goa: { food: 1300, local: 500, activities: 800 },
    jaipur: { food: 1000, local: 600, activities: 900 },
    udaipur: { food: 1100, local: 650, activities: 700 },
    jaisalmer: { food: 900, local: 550, activities: 1000 },
    jodhpur: { food: 950, local: 550, activities: 800 },
    ajabgarh: { food: 900, local: 700, activities: 600 },
    neemrana: { food: 850, local: 600, activities: 500 },
    ranthambore: { food: 900, local: 700, activities: 1500 },
    manali: { food: 900, local: 800, activities: 1200 },
    shimla: { food: 850, local: 750, activities: 600 },
    coorg: { food: 800, local: 700, activities: 700 },
    kumarakom: { food: 900, local: 600, activities: 1200 },
    kochi: { food: 1000, local: 650, activities: 700 },
    rishikesh: { food: 650, local: 350, activities: 600 },
    varanasi: { food: 600, local: 350, activities: 400 },
    gokarna: { food: 700, local: 400, activities: 400 },
    chennai: { food: 1100, local: 700, activities: 500 },
    puducherry: { food: 800, local: 400, activities: 400 },
    valparai: { food: 700, local: 500, activities: 600 },
  };

  const TIER_MULTIPLIER = {
    budget: 0.65,
    comfort: 1.0,
    boutique: 1.3,
    luxury: 1.8,
  };

  const cityKey = Object.keys(CITY_DATA).find(
    (k) => city.toLowerCase().includes(k) || k.includes(city.toLowerCase()),
  );
  const base = CITY_DATA[cityKey] ?? {
    food: 1000,
    local: 600,
    activities: 600,
  };
  const tier = TIER_MULTIPLIER[hotelCategory] ?? 1.0;

  const foodPPPD = Math.round(base.food * tier);
  const localPPPD = Math.round(base.local * tier);
  const activitiesPPPD = Math.round(base.activities * tier);

  const hotelCost = pricePerNight * nights;
  const foodCost = foodPPPD * guests * nights;
  const localCost = localPPPD * guests * nights;
  const activitiesCost = activitiesPPPD * guests * nights;
  const total = hotelCost + foodCost + localCost + activitiesCost;

  return JSON.stringify({
    nights,
    guests,
    hotelCost,
    foodCost,
    localTransportCost: localCost,
    activitiesCost,
    total,
    perPerson: Math.round(total / guests),
    perPersonPerDay: Math.round(total / guests / nights),
    breakdown: [
      `🏨 Hotel:       ₹${hotelCost.toLocaleString("en-IN")} (₹${pricePerNight.toLocaleString("en-IN")}/night × ${nights} nights)`,
      `🍽️  Food:        ₹${foodCost.toLocaleString("en-IN")} (₹${foodPPPD.toLocaleString("en-IN")}/person/day)`,
      `🚗 Transport:   ₹${localCost.toLocaleString("en-IN")} (₹${localPPPD.toLocaleString("en-IN")}/person/day)`,
      `🎯 Activities:  ₹${activitiesCost.toLocaleString("en-IN")} (₹${activitiesPPPD.toLocaleString("en-IN")}/person/day)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💰 Total:       ₹${total.toLocaleString("en-IN")}`,
      `👤 Per person:  ₹${Math.round(total / guests).toLocaleString("en-IN")}`,
    ].join("\n"),
  });
}

const availableFunctions = {
  searchHotels: searchHotelsImpl,
  getRooms: getRoomsImpl,
  estimateBudget: estimateBudgetImpl,
};

const tools = [
  {
    type: "function",
    function: {
      name: "searchHotels",
      description:
        "Search for hotels by city, vibe, category, and max price. Call this first when user wants to find hotels.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "Indian city name (required)",
          },
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
            description: "Vibe preference (optional)",
          },
          category: {
            type: "string",
            enum: ["budget", "comfort", "luxury", "boutique"],
            description: "Hotel category (optional)",
          },
          maxPrice: {
            type: "number",
            description: "Maximum starting price per night in INR (optional)",
          },
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
        "Get available rooms for a specific hotel. Call this after user selects a hotel.",
      parameters: {
        type: "object",
        properties: {
          hotelId: {
            type: "string",
            description: "MongoDB _id of the hotel from searchHotels result",
          },
          hotelSlug: {
            type: "string",
            description: "Slug of the hotel for building booking link",
          },
          hotelName: {
            type: "string",
            description: "Name of hotel for display",
          },
        },
        required: ["hotelId", "hotelSlug", "hotelName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimateBudget",
      description:
        "Estimate total trip cost including hotel, food, transport, and activities.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "Indian city name",
          },
          nights: {
            type: "number",
            description: "Number of nights",
          },
          guests: {
            type: "number",
            description: "Number of guests",
          },
          pricePerNight: {
            type: "number",
            description: "Room price per night in INR",
          },
          hotelCategory: {
            type: "string",
            enum: ["budget", "comfort", "luxury", "boutique"],
            description: "Hotel category",
          },
        },
        required: [
          "city",
          "nights",
          "guests",
          "pricePerNight",
          "hotelCategory",
        ],
      },
    },
  },
];

const concierge = asyncHandler(async (req, res) => {
  const { messages } = req.body;

  if (!messages || !messages.length) {
    throw new ApiError(400, "messages are required!");
  }

  const systemPrompt = `You are NestIQ's AI travel concierge for India.

FLOW YOU MUST ALWAYS FOLLOW:
1. Search hotels first using searchHotels tool with city (required), vibe (optional), category (optional), maxPrice (optional)
2. Present hotels clearly with name, price, rating, vibes
3. Ask user which hotel they like
4. When user picks one, call getRooms with hotelId, hotelSlug, hotelName from search results
5. Present available rooms with type, price, max guests
6. Tell user to click the booking link to reserve their room
7. NEVER suggest booking at hotel level — booking always happens at room level

Be concise, friendly, India-specific. Always use tools — never guess hotel names or prices.`;

  const conversationMessages = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...messages,
  ];

  let hotelResults = null;
  let roomResults = null;
  let finalResponse = "";
  let iterationCount = 0;
  const maxIterations = 5;

  try {
    while (iterationCount < maxIterations) {
      iterationCount++;

      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: conversationMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.4,
        max_completion_tokens: 1024,
      });

      const message = response.choices[0].message;
      conversationMessages.push(message);

      // No tool calls = final response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalResponse =
          message.content ?? "I found what you're looking for above.";
        break;
      }

      // Execute tools
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse =
          await availableFunctions[functionName](functionArgs);

        const parsed = JSON.parse(functionResponse);

        // ✅ Track results across iterations
        if (functionName === "searchHotels" && parsed.found) {
          hotelResults = parsed.hotels;
        }
        if (functionName === "getRooms" && parsed.found) {
          roomResults = {
            rooms: parsed.rooms,
            hotelName: parsed.hotelName,
            hotelSlug: parsed.hotelSlug,
          };
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: functionResponse,
        });
      }
    }

    if (hotelResults)
      finalResponse = injectHotelsMarker(finalResponse, hotelResults);
    if (roomResults)
      finalResponse = injectRoomsMarker(
        finalResponse,
        roomResults.rooms,
        roomResults.hotelName,
        roomResults.hotelSlug,
      );

    if (iterationCount >= maxIterations) {
      console.warn("⚠️  Max iterations reached");
      finalResponse =
        "I've reached my limit for this conversation. Please try again with a more specific request.";
    }

    console.log("📤 Streaming response to client...");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.write(finalResponse);
    res.end();
  } catch (error) {
    console.error("❌ Error in Concierge:", error.message);
    throw error;
  }
});

export { concierge };
