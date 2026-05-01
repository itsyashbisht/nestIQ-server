import { asyncHandler } from "../utils/asyncHandler.js";
import { generateObject, streamText } from "ai";
import { chatModel, structuredModel } from "../utils/groqAI.js";
import { Hotel, Room } from "../models/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { z } from "zod";
import { Groq } from "groq-sdk";
import mongoose from "mongoose";

// AI-search
const aiSearch = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) throw new ApiError(400, "Query is required");

  const { object } = await generateObject({
    model: structuredModel,
    // Force `response_format: json_object` (avoid `json_schema`, which not all Groq models support).
    providerOptions: { groq: { structuredOutputs: false } },
    schema: z.object({
      city: z.string().optional(),
      category: z.enum(["budget", "comfort", "luxury", "boutique"]).optional(),
      vibe: z
        .enum([
          "romantic",
          "family",
          "adventure",
          "business",
          "solo",
          "wellness",
        ])
        .optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      aiInsight: z
        .string()
        .describe("One sentence explaining what the user is looking for"),
    }),
    prompt: `Extract hotel search filters from this query: "${query}" Only extract what is clearly mentioned. Leave fields undefined if not mentioned.`,
  });

  const filter = { isActive: true };
  if (object.city) filter.city = { $regex: object.city, $options: "i" }; // i = case-insensitive
  if (object.category) filter.category = object.category;
  if (object.vibe) filter.vibes = { $in: [object.vibe] };
  if (object.minPrice || object.maxPrice) {
    filter.startingFrom = {};
    if (object.minPrice) filter.startingFrom.$gte = object.minPrice;
    if (object.maxPrice) filter.startingFrom.$lte = object.maxPrice;
  }

  const hotels = await Hotel.find(filter).sort({ rating: -1 }).limit(12);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        hotels,
        total: hotels.length,
        aiInsight: object.aiInsight,
        filter: object,
      },
      "AI search completed successfully",
    ),
  );
});

// Hotel specific-chat
const hotelChat = asyncHandler(async (req, res) => {
  const { messages, hotelId } = req.body;
  if (!messages?.length || !hotelId) {
    throw new ApiError(400, "messages and hotelId are required!");
  }

  const hotel = await Hotel.findById(hotelId).select(
    "name category city state startingFrom rating amenities vibes nearbyAttractions description checkInTime checkOutTime",
  );

  if (!hotel) throw new ApiError(404, "Hotel not found!");

  const rooms = await Room.find(
    { hotelId: hotelId },
    "name type description images pricePerNight maxGuests amenities isAvailable totalRooms",
  )
    .sort({ pricePerNight: -1 })
    .limit(12)
    .lean();
  if (!rooms || rooms.length === 0) throw new ApiError(404, "Rooms not found!");

  const roomDetails = rooms
    .map(
      (r) =>
        `${r.name} (${r.type}): ₹${r.pricePerNight?.toLocaleString("en-IN")}/night, ${r.maxGuests} guest(s), ${r.totalRooms} available, Amenities: ${r.amenities?.join(", ") || "N/A"}. ${r.description || ""}`,
    )
    .join("\n    ");

  const system = `You are a warm, professional hotel concierge assistant for ${hotel.name}. Your role is to provide expert, personalized service to guests with detailed knowledge of the hotel and room options.

📍 HOTEL PROFILE
Name: ${hotel.name}
Location: ${hotel.city}, ${hotel.state}
Category: ${hotel.category}
Rating: ${hotel.rating}/5
Starting Price: ₹${hotel.startingFrom?.toLocaleString("en-IN")}/night
Vibes: ${hotel.vibes.join(", ")}
Description: ${hotel.description}

🕐 CHECK-IN & CHECK-OUT
Check-in: ${hotel.checkInTime}
Check-out: ${hotel.checkOutTime}

🏨 HOTEL AMENITIES
${hotel.amenities.join(", ")}

🛏️ AVAILABLE ROOMS
    ${roomDetails}

🎯 NEARBY ATTRACTIONS
${hotel.nearbyAttractions?.join(", ") || "N/A"}

📋 YOUR ROLE GUIDELINES
• Answer ONLY about this hotel and its rooms using the information provided above.
• Be warm, helpful, and professional in every response.
• Keep responses concise (2-4 sentences max, unless detailed room info is needed).
• Always quote prices in Indian Rupees (₹).
• NEVER invent room availability, amenities, or details not listed above.
• NEVER suggest competing hotels or services outside this property.
• For booking inquiries, guide guests to complete their reservation on the platform.`;

  // ✅ No await — stream directly
  const result = streamText({
    model: chatModel,
    system,
    messages,
    maxTokens: 512,
    temperature: 0.4,
  });

  // ✅ Works on all AI SDK versions
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  for await (const chunk of result.textStream) {
    res.write(chunk);
  }

  res.end();
});

const generateListing = asyncHandler(async (req, res) => {
  const { description } = req.body;
  if (!description || description.trim().length < 30) {
    throw new ApiError(400, "Description must be at least 30 characters!");
  }

  const { object } = await generateObject({
    model: structuredModel,
    providerOptions: { groq: { structuredOutputs: false } },
    schema: z.object({
      name: z.string(),
      category: z.enum(["budget", "comfort", "luxury", "boutique"]),
      description: z.string().min(80),
      vibes: z.array(
        z.enum([
          "romantic",
          "family",
          "adventure",
          "business",
          "solo",
          "wellness",
        ]),
      ),
      amenities: z.array(z.string()).max(12),
      highlights: z.array(z.string()).max(5),
      seoTitle: z.string().max(60),
      seoDescription: z.string().max(160),
    }),
    prompt: `You are a hotel listing expert for NestIQ, an Indian hotel booking platform. Create a professional, accurate hotel listing from this description: "${description}" Be honest to what's described. Use India-appropriate context and language.`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, object, "Listing generated!"));
});

// GROQ NATIVE CONCIERGE - Tool Implementations

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "llama-3.3-70b-versatile";

async function searchHotelsImpl({ city, vibe, category, maxPrice }) {
  console.log("🔍 searchHotels CALLED with:", {
    city,
    vibe,
    category,
    maxPrice,
  });

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
  console.log("🏨 getRooms CALLED with:", { hotelId, hotelName, hotelSlug });

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
  console.log("🎯 CONCIERGE START - Received messages:", messages);

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

  let finalResponse = "";
  let iterationCount = 0;
  const maxIterations = 5;

  try {
    while (iterationCount < maxIterations) {
      iterationCount++;
      console.log(`\n📍 Iteration ${iterationCount}`);

      console.log("📞 Calling Groq API...");
      const response = await groq.chat.completions.create({
        model: MODEL,
        messages: conversationMessages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.4,
        max_completion_tokens: 1024,
      });

      const message = response.choices[0].message;
      console.log(
        "✅ Groq response received. Finish reason:",
        response.choices[0].finish_reason,
      );

      conversationMessages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalResponse = message.content;
        console.log("🏁 No tool calls. Final response received.");
        break;
      }

      console.log(
        `🔧 Model wants to call ${message.tool_calls.length} tool(s)`,
      );

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];

        if (!functionToCall) {
          console.error(`❌ Unknown function: ${functionName}`);
          continue;
        }

        console.log(`⚙️  Executing ${functionName}...`);
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await functionToCall(functionArgs);

        console.log(`✅ ${functionName} completed`);

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: functionName,
          content: functionResponse,
        });
      }
    }

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

export { hotelChat, aiSearch, generateListing, concierge };
