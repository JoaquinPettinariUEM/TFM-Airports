export function buildRoutesResponse(routes, airportMap) {
  const usedAirportIds = new Set();

  const normalizedRoutes = routes.map((route, index) => {
    route.path.forEach(id => {
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
      badge: getRouteBadge(index),
    };
  });

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

  return {
    airports,

    routes: normalizedRoutes,
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

  const randomAirport = middleAirports[Math.floor(Math.random() * middleAirports.length)];

  return airportMap[randomAirport]?.city ?? "";
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
