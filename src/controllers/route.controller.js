import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { getDayName } from "../utils/date.js";
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

    startDay: getDayName(startDate || new Date().toISOString()),

    tripDays: tripDays ? Number(tripDays) : 7,
  });

  const response = buildRoutesResponse(routes, airportMap);

  res.json(response);
}

export function getRouteById(req, res) {
  const { pathKey } = req.params;

  const { startDate, budget, maxStops, tripDays } = req.query;

  if (!pathKey) {
    return res.status(400).json({
      error: "pathKey is required",
    });
  }

  const graph = getGraph();

  const airportMap = getAirportMap();

  const path = pathKey.split("->");

  const from = path[0];

  const to = path[path.length - 1];

  const routes = findRoutes(graph, from, to, airportMap, {
    budget: budget ? Number(budget) : Infinity,

    maxStops: maxStops ? Number(maxStops) : 4,

    startDay: getDayName(startDate || new Date().toISOString()),

    tripDays: tripDays ? Number(tripDays) : 7,
  });

  const matchedRoute = routes.find(route => route.pathKey === pathKey);

  if (!matchedRoute) {
    return res.status(404).json({
      error: "Route not found",
    });
  }

  const enriched = enrichRouteDetails(matchedRoute, airportMap);

  res.json(enriched);
}
