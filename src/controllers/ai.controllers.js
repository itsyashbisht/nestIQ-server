import { asyncHandler } from "../utils/asyncHandler.js";
import { generateObject, streamText } from "ai";
import { chatModel, structuredModel } from "../utils/groqAI.js";
import { Hotel, Room } from "../models/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { z } from "zod";

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

export { hotelChat, aiSearch, generateListing };
