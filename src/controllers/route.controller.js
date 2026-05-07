import { findRoutes } from "../algorithms/dfs.js";
import { getGraph, getAirportMap } from "../services/graph.js";
import { enrichRoutes } from "../utils/enrichRoutes.js";

export function getRoutes(req, res) {
  const { from, to, budget, maxStops } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "from y to son requeridos" });
  }

  const graph = getGraph();
  const airportMap = getAirportMap();

  const routes = findRoutes(graph, from, to, airportMap, {
    budget: budget ? Number(budget) : Infinity,
    maxStops: maxStops ? Number(maxStops) : 4,
  });

  const enriched = enrichRoutes(routes, airportMap);

  res.json(enriched);
}
