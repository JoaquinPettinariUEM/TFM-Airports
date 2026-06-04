import { CityItinerary } from "../models/CityItinerary.js";
import { MOCK_CITY_ITINERARY } from "../mocks/cityItinerary.mock.js";
import { buildCityItineraryCacheKey } from "../utils/itinerary.js";
import { normalizeCity } from "../utils/normalizeCity.js";

export async function getCityItinerary(req, res) {
  try {
    const { city, country, days } = req.query;

    if (!city || !country || !days) {
      return res.status(400).json({
        error: "city, country and days are required",
      });
    }

    const normalizedDays = Number(days);
    if (!Number.isFinite(normalizedDays) || normalizedDays < 1) {
      return res.status(400).json({
        error: "days must be a valid positive number",
      });
    }

    const cacheKey = buildCityItineraryCacheKey({
      city,
      country,
      days: normalizedDays,
    });

    const existingItinerary = await CityItinerary.findOne({
      cacheKey,
    }).lean();

    if (existingItinerary) {
      return res.json({
        source: "database",
        cacheKey,
        itinerary: existingItinerary,
      });
    }

    return res.json({
      source: "mock",
      cacheKey,
      itinerary: buildMockItinerary({
        city: String(city),
        country: String(country),
        days: normalizedDays,
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Could not fetch city itinerary",
    });
  }
}

function buildMockItinerary({ city, country, days }) {
  const citySlug = `${normalizeCity(city)}-${normalizeCity(country)}`;
  const cacheKey = buildCityItineraryCacheKey({ city, country, days });

  return {
    ...MOCK_CITY_ITINERARY,
    city,
    country,
    citySlug,
    cacheKey,
    days,
    itineraryDays: MOCK_CITY_ITINERARY.itineraryDays.slice(0, days),
  };
}
