import { City } from "../models/City.js";
import { fetchWikipediaCity, createCitySlug } from "../services/wikipedia.js";
import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { buildRoutesResponse } from "../utils/enrichRoutes.js";

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

    maxStops: maxStops ? Number(maxStops) : 4,

    startDate: startDate || new Date().toISOString(),

    tripDays: tripDays ? Number(tripDays) : 7,
  });

  const response = buildRoutesResponse(routes, airportMap);

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
      .map(cityInfo => `${cityInfo.city.trim()}, ${cityInfo.country.trim()}`)
      .filter(Boolean);

    const slugs = cityNames.map(createCitySlug);

    const existingCities = await City.find({
      slug: {
        $in: slugs,
      },
    });

    const existingMap = new Map(existingCities.map(city => [city.slug, city]));

    const missingCities = cityNames.filter(city => {
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

    const orderedCities = cityNames
      .map(cityName => {
        const slug = createCitySlug(cityName);

        return allCities.find(city => city.slug === slug);
      })
      .filter(Boolean);

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
