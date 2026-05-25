export function buildRoutesResponse(routes, airportMap, options = {}) {
  const { budget = Infinity, maxStops = 4 } = options;
  const usedAirportIds = new Set();

  const normalizedRoutes = normalizeRoutes(routes, airportMap, usedAirportIds, getRouteBadge);
  const airports = buildAirportsMap(usedAirportIds, airportMap);

  const isBudgetFinite = Number.isFinite(budget);
  const recommendedPool = isBudgetFinite
    ? normalizedRoutes.filter((route) => route.cost <= budget)
    : normalizedRoutes;
  const expensivePool = isBudgetFinite
    ? normalizedRoutes.filter((route) => route.cost > budget)
    : [];

  const prioritizedRecommended = prioritizeByStops(recommendedPool, maxStops);
  const prioritizedAll = prioritizeByStops(normalizedRoutes, maxStops);
  const prioritizedExpensive = prioritizeByStops(expensivePool, maxStops);

  const bestRoute = prioritizedRecommended[0] ?? prioritizedAll[0] ?? null;
  const rawRecommendedRoutes = bestRoute
    ? prioritizedRecommended.filter((route) => route.id !== bestRoute.id)
    : [];
  const recommendedRoutes = rawRecommendedRoutes;
  const moreExpensiveOptions = prioritizedExpensive.map((route, index) => ({
    ...route,
    badge: getExpensiveRouteBadge(index),
  }));

  return {
    airports,
    routes,
    bestRoute,
    recommendedRoutes,
    moreExpensiveOptions,
  };
}

function normalizeRoutes(routes, airportMap, usedAirportIds, badgeResolver) {
  return routes.map((route, index) => {
    route.path.forEach((id) => {
      usedAirportIds.add(id);
    });

    return {
      id: buildRouteId(route.path),
      path: route.path,
      flights: route.flights,
      cost: route.cost,
      distance: route.distance,
      score: route.score,
      previewCity: getPreviewCity(route.path, airportMap),
      badge: badgeResolver(index),
    };
  });
}

function buildAirportsMap(usedAirportIds, airportMap) {
  const airports = {};

  usedAirportIds.forEach((id) => {
    const airport = airportMap[id];
    if (!airport) return;

    airports[id] = {
      _id: airport._id,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      location: airport.location,
    };
  });

  return airports;
}

function buildRouteId(path) {
  return Buffer.from(path.join("-")).toString("base64");
}

function getPreviewCity(path, airportMap) {
  const middleAirports = path.slice(1, -1);

  if (!middleAirports.length) {
    return airportMap[path[0]]?.city ?? "";
  }

  const selectedAirport = middleAirports.length > 1 ? middleAirports[1] : middleAirports[0];

  return airportMap[selectedAirport]?.city ?? "";
}

function getRouteBadge(index) {
  if (index === 0) return "Best Balance";
  if (index === 1) return "Best Price";
  if (index === 2) return "Fastest";
  return "Smart Choice";
}

function prioritizeByStops(routes, maxStops) {
  return [...routes]
    .filter((route) => route.path.length - 2 >= 1)
    .sort((a, b) => {
      const distanceA = Math.abs(a.path.length - 2 - maxStops);
      const distanceB = Math.abs(b.path.length - 2 - maxStops);

      if (distanceA !== distanceB) return distanceA - distanceB;
      if (a.score !== b.score) return a.score - b.score;
      return a.cost - b.cost;
    })
    .map((route) => {
      const stops = route.path.length - 2;
      const hasFewerStops = stops < maxStops;

      return hasFewerStops
        ? {
            ...route,
            badge: "Fewer Stops",
          }
        : route;
    });
}

function getExpensiveRouteBadge(index) {
  if (index === 0) return "Best Price";
  if (index === 1) return "Fastest";
  return "Smart Choice";
}
