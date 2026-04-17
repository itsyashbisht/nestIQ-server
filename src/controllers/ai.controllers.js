import { asyncHandler } from "../utils/asyncHandler.js";
import { generateObject, streamText } from "ai";
import { chatModel, structuredModel } from "../utils/groqAI.js";
import { z } from "zod";
import { Hotel } from "../models/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

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
    filter.pricePerNight = {};
    if (object.minPrice) filter.pricePerNight.$gte = object.minPrice;
    if (object.maxPrice) filter.pricePerNight.$lte = object.maxPrice;
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

// Hotel-chat
const hotelChat = asyncHandler(async (req, res) => {
  const { messages, hotelId } = req.body;
  if (!messages || !hotelId)
    throw new ApiError(400, "messages and hotelId are required!");

  const hotel = await Hotel.findOne({ slug: hotelId });
  if (!hotel) throw new ApiError(404, "Hotel not found!");

  const result = await streamText({
    model: chatModel,
    system: `You are a helpful assistant for ${hotel.name}, a ${hotel.category} hotel in ${hotel.city}, ${hotel.state}. Price: INR ${hotel.pricePerNight}/night. Rating: ${hotel.rating}/5. Amenities: ${hotel.amenities.join(", ")}. Vibes: ${hotel.vibes.join(", ")}. Nearby: ${hotel.nearbyAttractions?.join(", ")}. Answer questions about this hotel honestly and concisely. If you don't know something, say so.`,
    messages,
  });

  return result.pipeDataStreamToResponse(res);
});

const budgetPlanner = asyncHandler(async (req, res) => {
  const { city, nights, guests, pricePerNight } = req.body;
  if (!city || !nights || !guests || !pricePerNight) {
    throw new ApiError(
      400,
      "city, nights, guests and pricePerNight are required!",
    );
  }

  const { object } = await generateObject({
    model: structuredModel,
    providerOptions: { groq: { structuredOutputs: false } },
    schema: z.object({
      hotelBudget: z.number(),
      foodBudget: z.number(),
      travelBudget: z.number(),
      totalBudget: z.number(),
      tips: z.array(z.string()).max(3),
    }),
    prompt: `Calculate a realistic trip budget for ${guests} guest(s) staying ${nights} nights in ${city}, India. Hotel cost is INR ${pricePerNight * nights} total (INR ${pricePerNight}/night x ${nights} nights). Estimate local food and travel costs realistically for ${city}. All amounts in INR. Tips should be India-specific and practical.`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, object, "Budget generated!"));
});

const concierge = asyncHandler(async (req, res) => {
  const { messages } = req.body;
  if (!messages) throw new ApiError(400, "messages are required!");

  const result = await streamText({
    model: structuredModel,
    system: `You are NestIQ's AI travel concierge for India. Help users plan trips, find the right hotel, estimate budgets, and get travel advice.Be concise, friendly, and India-specific. Always give actionable suggestions.`,
    messages,
    maxSteps: 3,
    tools: {
      searchHotels: {
        description: "Search for hotels matching city and filters",
        parameters: z.object({
          city: z.string(),
          maxPrice: z.number().optional(),
          vibe: z.string().optional(),
        }),
        execute: async ({ city, maxPrice, vibe }) => {
          const filter = {
            isActive: true,
            city: { $regex: city, $options: "i" },
          };
          if (maxPrice != null) filter.pricePerNight = { $lte: maxPrice };
          if (vibe) filter.vibes = { $in: [vibe] };

          const hotels = await Hotel.find(filter).limit(4).lean();
          return hotels.map((h) => ({
            name: h.name,
            city: h.city,
            pricePerNight: h.pricePerNight,
            rating: h.rating,
            slug: h.slug,
          }));
        },
      },
    },
  });

  return result.pipeDataStreamToResponse(res);
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

export { hotelChat, aiSearch, budgetPlanner, concierge, generateListing };
