import { buildPath, INITIAL_PATH, readCSV } from "../utils/csv.js";
import { haversine } from "../utils/haversine.js";

let routes = null;

export async function createRoutes(airports) {
  console.log("Creando rutas!!!");

  const routeMap = new Map();
  const allRoutes = await readCSV(buildPath(INITIAL_PATH, "../../routes.dat"));

  const airportMap = new Map();
  airports.forEach(ap => airportMap.set(ap._id, ap));

  routes = allRoutes
    .filter(
      fly => fly.from && fly.to && airportMap.has(fly.from) && airportMap.has(fly.to)
    )
    .map(fly => {
      const fromAirport = airportMap.get(fly.from);
      const toAirport = airportMap.get(fly.to);

      if (!fromAirport || !toAirport) return null;

      const distance = haversine(
        fromAirport.location.lat,
        fromAirport.location.lon,
        toAirport.location.lat,
        toAirport.location.lon
      );

      const price = calculatePrice(distance);

      return {
        from: fly.from,
        to: fly.to,
        distance,
        price,
      };
    })
    .filter(route => {
      const key = `${route.from}-${route.to}`;

      if (!routeMap.has(key)) {
        routeMap.set(key, route);
        return true;
      }

      return false;
    });

  console.log("Routes generadas:", routes.length);
}

export const getRoutes = () => {
  return routes;
};

function calculatePrice(distance) {
  const baseFare = 30;
  const costPerKm = 0.12;

  const randomFactor = 0.8 + Math.random() * 0.4;

  return Math.round((baseFare + distance * costPerKm) * randomFactor);
}
