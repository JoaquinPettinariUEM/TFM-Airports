export function buildRoutesResponse(routes, airportMap, options = {}) {
  const { budget = Infinity } = options;
  const usedAirportIds = new Set();

  const normalizedRoutes = normalizeRoutes(routes, airportMap, usedAirportIds, getRouteBadge);

  const airports = {};

  usedAirportIds.forEach(id => {
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

  const isBudgetFinite = Number.isFinite(budget);
  const recommendedPool = isBudgetFinite
    ? normalizedRoutes.filter(route => route.cost <= budget)
    : normalizedRoutes;
  const expensivePool = isBudgetFinite
    ? normalizedRoutes.filter(route => route.cost > budget)
    : [];

  const bestRoute = recommendedPool[0] ?? normalizedRoutes[0] ?? null;
  const rawRecommendedRoutes = bestRoute
    ? recommendedPool.filter(route => route.id !== bestRoute.id)
    : [];
  const recommendedRoutes = diversifyByFirstHop(rawRecommendedRoutes);
  const moreExpensiveOptions = bestRoute
    ? expensivePool.filter(route => route.id !== bestRoute.id)
    : expensivePool;

  return {
    airports,
    bestRoute,
    recommendedRoutes,
    moreExpensiveOptions: moreExpensiveOptions.map((route, index) => ({
      ...route,
      badge: getExpensiveRouteBadge(index),
    })),
  };
}

function normalizeRoutes(routes, airportMap, usedAirportIds, badgeResolver) {
  return routes.map((route, index) => {
    route.path.forEach(id => {
      usedAirportIds.add(id);
    });

    return {
      ...pickBaseRouteFields(route),
      previewCity: getPreviewCity(route.path, airportMap),
      badge: badgeResolver(index),
    };
  });
}

function pickBaseRouteFields(route) {
  return {
    id: buildRouteId(route.path),
    path: route.path,
    flights: route.flights,
    cost: route.cost,
    distance: route.distance,
    score: route.score,
  };
}

function buildRouteId(path) {
  return Buffer.from(path.join("-")).toString("base64");
}

function getPreviewCity(path, airportMap) {
  const middleAirports = path.slice(1, -1);

  if (!middleAirports.length) {
    return airportMap[path[0]]?.city ?? "";
  }

  const selectedAirport =
    middleAirports.length > 1 ? middleAirports[1] : middleAirports[0];

  return airportMap[selectedAirport]?.city ?? "";
}

function getRouteBadge(index) {
  if (index === 0) {
    return "Best Balance";
  }

  if (index === 1) {
    return "Best Price";
  }

  if (index === 2) {
    return "Fastest";
  }

  return "Smart Choice";
}
function getExpensiveRouteBadge(index) {
  if (index === 0) {
    return "Best Price";
  }

  if (index === 1) {
    return "Fastest";
  }

  return "Smart Choice";
}

function diversifyByFirstHop(routes) {
  if (routes.length <= 1) return routes;

  const firstHopSeen = new Set();
  const uniqueFirstHop = [];
  const remaining = [];

  for (const route of routes) {
    const firstHop = route.path?.[1] ?? "";

    if (firstHop && !firstHopSeen.has(firstHop)) {
      firstHopSeen.add(firstHop);
      uniqueFirstHop.push(route);
      continue;
    }

    remaining.push(route);
  }

  return [...uniqueFirstHop, ...remaining];
}
