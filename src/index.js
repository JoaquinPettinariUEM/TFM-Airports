import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { createCSVWithOnlyLargeAirports } from "./utils/csv.js";
import Airport from "./models/Airport.js";
import { importAirports } from "./scripts/importAirports.js";
import { createRoutes, getRoutes } from "./service/routes.js";
import { buildGraph } from "./service/graph.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  const airports = await Airport.find();
  if (!airports?.length) {
    await createCSVWithOnlyLargeAirports();
    await importAirports();
  }

  console.time("buildRoutes");
  await createRoutes(airports);
  console.timeEnd("buildGraph");
  const routes = getRoutes();

  console.time("buildGraph");
  const graph = buildGraph(routes, airports);
  console.timeEnd("buildGraph");

  console.log(graph);

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

await startServer();
