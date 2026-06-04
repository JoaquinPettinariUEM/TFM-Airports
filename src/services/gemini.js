import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
Generate a travel itinerary in English for ${city}, ${country}.
Duration: ${days} days.

Rules:
- Keep the copy concise and practical.
- Include a short city summary and a short description.
- Include estimated daily budget in local currency.
- Include best season to visit in a very short format with up to two month abbreviations, for example "Apr/Sep".
- Include average weather guidance.
- Include concrete, useful travel tips.
- Use only these activity categories: "History", "Gastronomy", "Culture", "Must-see", "Nature".
- Each activity must include time, name, short description, category, and a useful map query.
- If you include reference links, prefer Wikipedia or another stable informational source.
- Return ONLY valid JSON.

Estructura esperada:
{
  "city": "",
  "country": "",
  "summary": "",
  "shortDescription": "",
  "budgetLevel": "",
  "estimatedDailyBudget": {
    "min": 0,
    "max": 0,
    "currency": ""
  },
  "currency": "",
  "bestSeason": "",
  "averageWeather": "",
  "tips": [""],
  "itineraryDays": [
    {
      "day": 1,
      "title": "",
      "activities": [
        {
          "time": "",
          "name": "",
          "description": "",
          "type": "",
          "mapQuery": "",
          "moreInfoUrl": ""
        }
      ]
    }
  ],
  "historicalInfoUrl": "",
  "mapUrl": ""
}
`.trim();
}

export async function generateCityItinerary({ city, country, days }) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildCityItineraryPrompt({ city, country, days }),
  });

  return JSON.parse(response.text);
}
