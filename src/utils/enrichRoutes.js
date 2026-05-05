export function enrichRoutes(routes, airportMap) {
  return routes.map(route => ({
    ...route,
    pathDetailed: route.path.map(id => airportMap[id]),
  }));
}
