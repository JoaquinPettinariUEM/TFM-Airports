import { findRoutes } from "../algorithms/dfs.js";
import { getGraph } from "../service/graph.js";

export function getRoutes(req, res) {
  const { from, to, budget, maxStops } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "from y to son requeridos" });
  }

  const graph = getGraph();

  const results = findRoutes(graph, from, to, {
    budget: budget ? Number(budget) : Infinity,
    maxStops: maxStops ? Number(maxStops) : 4,
  });
  console.log(graph);

  res.json(results);
}
