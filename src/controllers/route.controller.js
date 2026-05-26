import { City } from "../models/City.js";
import { fetchWikipediaCity, createCitySlug } from "../services/wikipedia.js";
import { getCityImage } from "../services/cityImage.js";
import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { buildRoutesResponse } from "../utils/enrichRoutes.js";
import { normalizeCity } from "../utils/normalizeCity.js";

export function getRoutes(req, res) {
  const { from, to, budget, maxStops, startDate, tripDays } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      error: "from y to son requeridos",
    });
  }

  const graph = getGraph();

  const airportMap = getAirportMap();

  const routes = findRoutes(graph, from, to, airportMap, {
    budget: budget ? Number(budget) : Infinity,
    minStops: 0,
    maxStops: maxStops ? Number(maxStops) : 4,

    startDate: startDate || new Date().toISOString(),

    tripDays: tripDays ? Number(tripDays) : 7,
  });

  const response = buildRoutesResponse(routes, airportMap, {
    budget: budget ? Number(budget) : Infinity,
    maxStops: maxStops ? Number(maxStops) : 4,
  });

  res.json(response);
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
