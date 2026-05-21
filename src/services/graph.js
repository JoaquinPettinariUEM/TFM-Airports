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
      cityTier: ap.cityTier,
      popularityScore: ap.popularityScore,
      recommendedStayDays: ap.recommendedStayDays,
    };

    graph[ap._id] = [];
  });

  routes.forEach(route => {
    const { from, to, distance, basePrice, schedules } = route;

    if (!graph[from]) graph[from] = [];

    graph[from].push({
      to,
      distance,
      basePrice,
      schedules,
    });
  });

  return graph;
}

export const getGraph = () => graph;

export const getAirportMap = () => airportMap;
