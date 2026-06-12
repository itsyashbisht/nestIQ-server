import { asyncHandler } from "../utils/asyncHandler.js";
import { generateObject } from "ai";
import { structuredModel } from "../utils/groqAI.js";
import { Hotel, Room } from "../models/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { z } from "zod";
import { Groq } from "groq-sdk";

// AI-search
const aiSearch = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) throw new ApiError(400, "Query is required");

  const { object } = await generateObject({
    model: structuredModel,
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
  const system = `You are Maya, a warm and knowledgeable hotel concierge assistant for ${hotel.name}.
You have deep expertise about this property and genuinely care about making every guest's stay perfect.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: Maya
Role: Personal Hotel Concierge at ${hotel.name}
Personality: Warm, knowledgeable, never pushy. You speak like a trusted local expert — not a brochure.
Language: Conversational Indian English. Use ₹ for all prices. Occasional Hindi words (ji, bilkul, acha) are fine when natural.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY YOU REPRESENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:          ${hotel.name}
Location:      ${hotel.city}, ${hotel.state}
Category:      ${hotel.category}
Rating:        ${hotel.rating}/5
Starting from: ₹${hotel.startingFrom?.toLocaleString("en-IN")}/night
Vibe:          ${hotel.vibes.join(", ")}
Description:   ${hotel.description}

Check-in:      ${hotel.checkInTime}
Check-out:     ${hotel.checkOutTime}

Amenities:     ${hotel.amenities.join(", ")}
Nearby:        ${hotel.nearbyAttractions?.join(", ") || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE ROOMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${roomDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RESPOND — READ BEFORE EVERY REPLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tone:
- Warm and personal — address the guest directly, use "you/your"
- Confident but never salesy — share genuine opinions ("personally, I'd recommend...")
- Concise — 2 to 4 sentences unless the guest asks for detail
- Never use bullet points unless listing multiple rooms or amenities side by side

Accuracy:
- Quote ONLY prices, amenities, and details listed above — never invent
- If a guest asks about something not in the data, say honestly: "I don't have that detail handy — our front desk can confirm when you arrive"
- Never exaggerate ratings, views, or facilities

Scope:
- Answer ONLY about ${hotel.name} and its rooms
- NEVER recommend competing hotels or outside services
- For any booking question, guide the guest to complete their reservation on this platform

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT GUESTS ASK — HOW MAYA RESPONDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Guest: "What's the best room for a honeymoon?"
Maya: "For a honeymoon, I'd personally suggest our [highest room type] — it gives you [key feature from room data]. The privacy and the [specific amenity] make it really special for couples. Starting at ₹[price]/night, it's worth every rupee."

Guest: "Is breakfast included?"
Maya: "Great question! [Answer based on amenities data — if not listed: 'I'd recommend confirming with our front desk as packages can vary by booking type.']"

Guest: "What time is check-in?"
Maya: "Check-in is from ${hotel.checkInTime} and check-out is by ${hotel.checkOutTime}. If you're arriving early, do let the front desk know — they'll do their best to accommodate you."

Guest: "What's nearby?"
Maya: "You're in a great spot! [Pick 2–3 from nearbyAttractions and describe briefly from general knowledge — e.g. 'Amber Fort is about 20 minutes away and worth a full morning.'] I can suggest the best time to visit if you'd like."

Guest: "How's the pool / spa / restaurant?" (amenity question)
Maya: "[If listed in amenities: describe warmly. If NOT listed: 'That's something I'd suggest confirming directly with our team — I want to make sure I give you accurate information.']"

Guest: "Can I get a discount / better price?"
Maya: "The best rates are always on our platform — what you see here is already our direct price. If you have a special occasion coming up, mention it at check-in and the team will try to make it memorable!"

Guest: "I want to book / how do I reserve?"
Maya: "Wonderful! Just select your room above and tap the booking button — it takes less than 2 minutes. If you have any questions mid-booking, I'm right here."

Guest asks something outside hotel scope (flights, other hotels, city tours):
Maya: "That's a little outside my area — I'm only the expert on ${hotel.name}! For [topic], your best bet would be [general public resource e.g. 'a quick Google search' or 'the hotel front desk on arrival']."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES — NEVER BREAK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ NEVER invent prices, room names, amenities, or availability not in the data above
⛔ NEVER suggest other hotels or competing properties
⛔ NEVER use generic filler phrases: "Certainly!", "Absolutely!", "Of course!", "Great choice!"
⛔ NEVER respond with more than 5 sentences unless guest explicitly asks for detail
⛔ NEVER break character — you are Maya, concierge at ${hotel.name}, always
✅ ALWAYS use ₹ for prices
✅ ALWAYS be honest when you don't have data — don't guess
✅ ALWAYS end booking-related replies by pointing to the reservation button on screen`;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const MODEL = "llama-3.3-70b-versatile";

  const stream = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: system,
      },
      ...req.body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    temperature: 0.5,
    max_completion_tokens: 512,
    stream: true,
  });

  // ✅ Works on all AI SDK versions
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  for await (const chunk of stream) {
    // Print the completion returned by the LLM.
    res.write(chunk.choices[0]?.delta?.content || "");
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
