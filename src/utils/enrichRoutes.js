export function buildRoutesResponse(routes, airportMap, options = {}) {
  const FINAL_RESULTS_LIMIT = 20;
  const { budget = Infinity, maxStops = 4 } = options;
  const usedAirportIds = new Set();

  const normalizedRoutes = normalizeRoutes(routes, airportMap, usedAirportIds, getRouteBadge);
  const uniqueByFirstHopRoutes = keepBestPerFirstHop(normalizedRoutes);
  const airports = buildAirportsMap(usedAirportIds, airportMap);

  const isBudgetFinite = Number.isFinite(budget);
  const recommendedPool = isBudgetFinite
    ? uniqueByFirstHopRoutes.filter((route) => route.cost <= budget)
    : uniqueByFirstHopRoutes;
  const expensivePool = isBudgetFinite
    ? uniqueByFirstHopRoutes.filter((route) => route.cost > budget)
    : [];

  const prioritizedRecommended = prioritizeByStops(recommendedPool, maxStops);
  const prioritizedAll = prioritizeByStops(uniqueByFirstHopRoutes, maxStops);
  const prioritizedExpensive = prioritizeByStops(expensivePool, maxStops);

  const bestRoute = prioritizedRecommended[0] ?? prioritizedAll[0] ?? null;
  const rawRecommendedRoutes = bestRoute
    ? prioritizedRecommended.filter((route) => route.id !== bestRoute.id)
    : [];
  const recommendedRoutes = rawRecommendedRoutes.slice(
    0,
    Math.max(0, FINAL_RESULTS_LIMIT - (bestRoute ? 1 : 0)),
  );
  const moreExpensiveOptions = prioritizedExpensive
    .slice(0, FINAL_RESULTS_LIMIT)
    .map((route, index) => ({
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

function keepBestPerFirstHop(routes) {
  const bestByFirstHop = new Map();

  routes.forEach((route) => {
    const firstHop = route.path[1] ?? "__direct__";
    const existing = bestByFirstHop.get(firstHop);

    if (!existing) {
      bestByFirstHop.set(firstHop, route);
      return;
    }

    if (route.score < existing.score) {
      bestByFirstHop.set(firstHop, route);
      return;
    }

    if (route.score === existing.score && route.cost < existing.cost) {
      bestByFirstHop.set(firstHop, route);
    }
  });

  return [...bestByFirstHop.values()];
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
