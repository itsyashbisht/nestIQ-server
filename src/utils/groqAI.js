import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// For streamText — hotel chat, concierge
export const chatModel = groq("llama-3.1-70b-versatile");

// For generateObject — search filters, budget, listing
export const structuredModel = groq("llama-3.1-8b-instant");
