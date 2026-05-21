import { addDays, format } from "date-fns";
import { WEEK_DAYS } from "../utils/date.js";
import {
  addResult,
  canContinue,
  findFlightsAfterDate,
  formatResult,
  isSolution,
} from "./extras.js";

export function findRoutes(graph, start, target, airportMap, options = {}) {
  const config = {
    budget: Infinity,
    maxStops: 4,
    maxResults: 10,

    startDate: new Date().toISOString(),
    tripDays: 7,

    ...options,
  };

  const startDate = new Date(config.startDate);

  const endDate = addDays(startDate, config.tripDays);

  const results = [];

  dfs(
    graph,
    start,
    target,
    {
      path: [start],

      flights: [],

      cost: 0,
      distance: 0,

      currentDateTime: startDate,
    },
    {
      results,
      options: config,
      target,
      airportMap,
      endDate,
    }
  );

  return results.sort((a, b) => a.score - b.score);
}

function dfs(graph, current, target, state, context) {
  const { path, flights, cost, distance, currentDateTime } = state;

  const { results, options, airportMap, endDate } = context;

  if (!canContinue(state, options, results)) {
    return;
  }

  if (currentDateTime > endDate) {
    return;
  }

  if (isSolution(current, target, state)) {
    const result = formatResult(state, airportMap, target);

    addResult(results, result, options.maxResults);

    return;
  }

  const neighbors = graph[current] || [];

  for (const edge of neighbors) {
    const next = edge.to;

    if (path.includes(next)) continue;

    const availableFlights = findFlightsAfterDate(edge, currentDateTime);

    for (const flight of availableFlights) {
      const arrivalDate = new Date(
        flight.departureDate.getTime() + flight.durationMinutes * 60000
      );

      const stayDays = getRecommendedStayDays(airportMap[next]);

      const nextSearchDate = addDays(arrivalDate, stayDays);

      dfs(
        graph,
        next,
        target,
        {
          path: [...path, next],

          flights: [
            ...flights,
            {
              from: current,
              to: next,

              departureDate: format(flight.departureDate, "yyyy-MM-dd'T'HH:mm"),

              arrivalDate: format(arrivalDate, "yyyy-MM-dd'T'HH:mm"),

              durationMinutes: flight.durationMinutes,

              stayDays,

              day: WEEK_DAYS[flight.departureDate.getDay()],
            },
          ],

          cost: cost + edge.basePrice,

          distance: distance + edge.distance,

          currentDateTime: nextSearchDate,
        },
        context
      );
    }
  }
}

function getRecommendedStayDays(airport) {
  const recommended = Number(airport?.recommendedStayDays);

  if (Number.isFinite(recommended) && recommended >= 1) {
    return recommended;
  }

  return 2;
}
