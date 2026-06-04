import { CityItinerary } from "../models/CityItinerary.js";
import { MOCK_CITY_ITINERARY } from "../mocks/cityItinerary.mock.js";
import {
  CITY_ITINERARY_PROMPT_VERSION,
  GEMINI_MODEL,
  generateCityItinerary,
} from "../services/gemini.js";
import { getCityGalleryImages } from "../services/unsplash.js";
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

    try {
      const generated = await generateCityItinerary({
        city: String(city),
        country: String(country),
        days: normalizedDays,
      });

      const galleryImages = await getCityGalleryImages({
        city: String(city),
        country: String(country),
        limit: 4,
      });

      const itineraryToSave = buildGeneratedItinerary({
        city: String(city),
        country: String(country),
        days: normalizedDays,
        cacheKey,
        generated,
        galleryImages,
      });

      const savedItinerary = await CityItinerary.findOneAndUpdate({ cacheKey }, itineraryToSave, {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }).lean();

      return res.json({
        source: "generated",
        cacheKey,
        itinerary: savedItinerary,
      });
    } catch (generationError) {
      console.error("Could not generate itinerary, falling back to mock", generationError);
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

function buildGeneratedItinerary({ city, country, days, cacheKey, generated, galleryImages }) {
  const citySlug = `${normalizeCity(city)}-${normalizeCity(country)}`;

  return {
    ...generated,
    city,
    country,
    citySlug,
    cacheKey,
    days,
    heroImage: galleryImages[0] ?? null,
    galleryImages,
    sourceModel: GEMINI_MODEL,
    promptVersion: CITY_ITINERARY_PROMPT_VERSION,
    cachedAt: new Date(),
  };
}
