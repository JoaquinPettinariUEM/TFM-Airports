import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { buildRoutesResponse } from "../utils/enrichRoutes.js";
import { buildRouteFromPath } from "../utils/routeBuilder.js";

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

export function getRouteById(req, res) {
  const { pathKey } = req.params;
  const { startDate } = req.query;

  if (!pathKey) {
    return res.status(400).json({
      error: "pathKey is required",
    });
  }

  if (!startDate) {
    throw new Error("startDate is required");
  }

  const graph = getGraph();
  const airportMap = getAirportMap();

  const path = pathKey.split("->");

  const route = buildRouteFromPath(path, graph, airportMap, { startDate });

  if (!route) {
    return res.status(404).json({
      error: "Route not found",
    });
  }

  res.json(route);
}
