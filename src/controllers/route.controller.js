import { City } from "../models/City.js";
import { fetchWikipediaCity, createCitySlug } from "../services/wikipedia.js";
import { getCityImage } from "../services/cityImage.js";
import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { buildRoutesResponse } from "../utils/enrichRoutes.js";
import { normalizeCity } from "../utils/normalizeCity.js";
import { MOCK_SUGGESTED_ROUTES } from "../mocks/popularRoutes.mock.js";

export function getRoutes(req, res) {
  const {
    from,
    to,
    budget,
    maxStops,
    startDate,
    tripDays,
    pathTemplate,
    via,
    stayDays,
    stayDaysTemplate,
  } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: "from y to son requeridos",
    });
  }

  const graph = getGraph();

  const airportMap = getAirportMap();
  const startedAt = Date.now();

  const parsedTemplate =
    typeof pathTemplate === "string"
      ? pathTemplate
          .split("->")
          .map((token) => token.trim())
          .filter(Boolean)
      : null;

  const derivedStopsFromTemplate =
    Array.isArray(parsedTemplate) && parsedTemplate.length >= 2 ? parsedTemplate.length - 2 : null;

  const effectiveMaxStops =
    typeof derivedStopsFromTemplate === "number"
      ? derivedStopsFromTemplate
      : maxStops
        ? Number(maxStops)
        : 4;

  const routes = findRoutes(graph, from, to, airportMap, {
    budget: budget ? Number(budget) : Infinity,
    minStops: 0,
    maxStops: effectiveMaxStops,

    startDate: startDate || new Date().toISOString(),

    tripDays: tripDays ? Number(tripDays) : 7,
    pathTemplate: typeof pathTemplate === "string" ? pathTemplate : undefined,
    via: typeof via === "string" ? via : "",
    stayDays: typeof stayDays === "string" ? stayDays : "",
    stayDaysTemplate: typeof stayDaysTemplate === "string" ? stayDaysTemplate : "",
  });

  const response = buildRoutesResponse(routes, airportMap, {
    budget: budget ? Number(budget) : Infinity,
    maxStops: effectiveMaxStops,
    pathTemplate: typeof pathTemplate === "string" ? pathTemplate : "",
  });
  const notFoundCities = inferNotFoundCities(pathTemplate, graph, from, to);

  res.json({
    ...response,
    notFoundCities,
    elapsedMs: Date.now() - startedAt,
  });
}

export function getPopularRoutes(req, res) {
  const airportMap = getAirportMap();
  const usedAirportIds = new Set(MOCK_SUGGESTED_ROUTES.flatMap((route) => route.path));
  const airports = {};

  usedAirportIds.forEach((id) => {
    const airport = airportMap[id];
    if (!airport) return;
    airports[id] = {
      _id: airport._id,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      location: airport.location,
    };
  });

  return res.json({
    airports,
    popularRoutes: MOCK_SUGGESTED_ROUTES,
  });
}

export async function getRouteDetails(req, res) {
  try {
    const body = req.body;
    const cities = body.citiesInfo;

    if (!cities) {
      return res.status(400).json({
        error: "cities query param is required",
      });
    }

    const cityNames = cities
      .map((cityInfo) => `${cityInfo.city.trim()}, ${cityInfo.country.trim()}`)
      .filter(Boolean);

    const slugs = cityNames.map(createCitySlug);

    const existingCities = await City.find({
      slug: {
        $in: slugs,
      },
    });

    const existingMap = new Map(existingCities.map((city) => [city.slug, city]));

    const missingCities = cityNames.filter((city) => {
      const slug = createCitySlug(city);

      return !existingMap.has(slug);
    });

    const newCities = [];

    for (const cityName of missingCities) {
      const wikipediaData = await fetchWikipediaCity(cityName);

      if (!wikipediaData) {
        continue;
      }

      const createdCity = await City.create({
        slug: createCitySlug(cityName),
        name: wikipediaData.name,
        description: wikipediaData.description,
        country: wikipediaData.country,
        summary: wikipediaData.summary,
        image: wikipediaData.image,
        wikipediaUrl: wikipediaData.wikipediaUrl,
        coordinates: wikipediaData.coordinates,
      });

      newCities.push(createdCity);
    }

    const allCities = [...existingCities, ...newCities];

    const orderedCities = await Promise.all(
      cities.map(async (cityInfo, index) => {
        const cityName = cityNames[index];
        const slug = createCitySlug(cityName);
        const match = allCities.find((city) => city.slug === slug);

        if (match) {
          return await withImageFallback(match, cityInfo, req);
        }

        const fallbackCity = {
          _id: slug,
          slug,
          name: cityInfo.city,
          country: cityInfo.country,
          description: `${cityInfo.city}, ${cityInfo.country}`,
          summary: "No additional city information available for this stop.",
          image: null,
          wikipediaUrl: null,
          coordinates: cityInfo.location
            ? {
                lat: cityInfo.location.lat,
                lon: cityInfo.location.lon,
              }
            : null,
          source: "fallback",
          cachedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return await withImageFallback(fallbackCity, cityInfo, req);
      }),
    );

    return res.json({
      ...body,
      citiesInfo: orderedCities,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

function inferNotFoundCities(pathTemplate, graph, from, to) {
  if (typeof pathTemplate !== "string" || !pathTemplate.trim()) return [];

  const start = String(from || "").toUpperCase();
  const target = String(to || "").toUpperCase();

  const tokens = pathTemplate
    .split("->")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  if (!tokens.length) return [];

  return tokens.filter((token, index) => {
    if (index === 0 || index === tokens.length - 1) return false;
    if (token === "?" || token === start || token === target) return false;

    const edges = graph?.[token];
    return !Array.isArray(edges) || edges.length === 0;
  });
}

async function withImageFallback(cityData, cityInfo, req) {
  if (cityData.image) {
    return cityData;
  }

  const cityName = cityInfo?.city ?? cityData?.name;
  if (!cityName) {
    return cityData;
  }

  try {
    await getCityImage(cityName);
  } catch (error) {
    return cityData;
  }

  const normalized = normalizeCity(cityName);
  const host = req.get("host");
  const baseUrl = `${req.protocol}://${host}`;
  return {
    ...cityData,
    image: `${baseUrl}/cities/${normalized}.jpg`,
  };
}
