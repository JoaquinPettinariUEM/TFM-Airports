const graph = {};
const airportMap = {};

export function buildGraph(routes, airports) {
  airports.forEach(ap => {
    airportMap[ap._id] = {
      _id: ap._id,
      name: ap.name,
      city: ap.city,
      country: ap.country,
      location: ap.location,
    };

    graph[ap._id] = [];
  });

  routes.forEach(route => {
    const { from, to, distance, price } = route;

    if (!graph[from]) graph[from] = [];

    graph[from].push({
      to,
      distance,
      price,
    });
  });

  return graph;
}

export const getGraph = () => graph;

export const getAirportMap = () => airportMap;
