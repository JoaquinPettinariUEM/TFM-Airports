import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
export const CITY_ITINERARY_PROMPT_VERSION = "v2";

const CITY_ITINERARY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    city: { type: "string" },
    country: { type: "string" },
    summary: { type: "string" },
    shortDescription: { type: "string" },
    budgetLevel: {
      type: "string",
      enum: ["Low", "Moderate", "High"],
    },
    estimatedDailyBudget: {
      type: "object",
      properties: {
        min: { type: "number" },
        max: { type: "number" },
        currency: { type: "string" },
      },
      required: ["min", "max", "currency"],
    },
    currency: { type: "string" },
    bestSeason: { type: "string" },
    averageWeather: { type: "string" },
    tips: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
    },
    itineraryDays: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "number" },
          title: { type: "string" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                type: {
                  type: "string",
                  enum: ["History", "Gastronomy", "Culture", "Must-see", "Nature"],
                },
                mapQuery: { type: "string" },
                moreInfoUrl: { type: "string" },
              },
              required: ["time", "name", "description", "type", "mapQuery", "moreInfoUrl"],
            },
            minItems: 3,
            maxItems: 5,
          },
        },
        required: ["day", "title", "activities"],
      },
    },
    historicalInfoUrl: { type: "string" },
    mapUrl: { type: "string" },
  },
  required: [
    "city",
    "country",
    "summary",
    "shortDescription",
    "budgetLevel",
    "estimatedDailyBudget",
    "currency",
    "bestSeason",
    "averageWeather",
    "tips",
    "itineraryDays",
    "historicalInfoUrl",
    "mapUrl",
  ],
};

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

export function buildCityItineraryPrompt({ city, country, days }) {
  return `
Generate structured travel itinerary data for a trip planning app.

Trip context:
- City: ${city}
- Country: ${country}
- Duration: ${days} days

Rules:
- Return ONLY valid JSON.
- Do not include markdown, comments, or explanations.
- Keep all copy concise, practical, and UI-friendly.
- summary: exactly 1 sentence.
- shortDescription: 1 short paragraph, max 220 characters.
- budgetLevel must be one of: "Low", "Moderate", "High".
- bestSeason must be very short, with up to 2 month abbreviations, for example: "Apr/Sep".
- averageWeather must be short, for example: "18C - 28C".
- currency must be formatted like: "Euro (EUR)".
- tips must contain 3 to 5 short practical travel tips.
- Create exactly ${days} itinerary days.
- Each day must contain 3 to 5 activities.
- Activities must be ordered chronologically.
- Each activity description must be 1 sentence only.
- Use only these activity categories:
  "History", "Gastronomy", "Culture", "Must-see", "Nature"
- Each activity must include a useful Google Maps search query in "mapQuery".
- If including reference links, prefer Wikipedia or another stable informational source.
- Do NOT include image URLs.
- Do NOT include fields outside the requested JSON structure.
`.trim();
}

export async function generateCityItinerary({ city, country, days }) {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildCityItineraryPrompt({ city, country, days }),
    config: {
      responseMimeType: "application/json",
      responseSchema: CITY_ITINERARY_RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  });

  return normalizeGeneratedItinerary(JSON.parse(response.text));
}

function normalizeGeneratedItinerary(payload) {
  return {
    city: payload.city ?? "",
    country: payload.country ?? "",
    summary: payload.summary ?? "",
    shortDescription: payload.shortDescription ?? "",
    budgetLevel: payload.budgetLevel ?? "Moderate",
    estimatedDailyBudget: {
      min: Number(payload.estimatedDailyBudget?.min ?? 0),
      max: Number(payload.estimatedDailyBudget?.max ?? 0),
      currency: payload.estimatedDailyBudget?.currency ?? "EUR",
    },
    currency: payload.currency ?? "",
    bestSeason: payload.bestSeason ?? "",
    averageWeather: payload.averageWeather ?? "",
    tips: Array.isArray(payload.tips) ? payload.tips.slice(0, 5) : [],
    itineraryDays: Array.isArray(payload.itineraryDays) ? payload.itineraryDays : [],
    historicalInfoUrl: payload.historicalInfoUrl ?? null,
    mapUrl: payload.mapUrl ?? null,
  };
}
