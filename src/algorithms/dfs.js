import { haversine } from "../utils/haversine.js";

const MIN_LAYOVER_MINUTES = 120;

export function findRoutes(graph, start, target, airportMap, options = {}) {
  const config = {
    budget: Infinity,
    maxStops: 4,
    maxResults: 10,

    startDay: "monday",
    startTime: "08:00",

    ...options,
  };

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

      currentDay: config.startDay,
      currentTime: config.startTime,
    },
    {
      results,
      options: config,
      target,
      airportMap,
    }
  );

  return results.sort((a, b) => a.score - b.score);
}

function dfs(graph, current, target, state, context) {
  const { path, cost, distance, currentDay, currentTime, flights } = state;

  const { results, options, airportMap } = context;

  if (!canContinue(state, options, results)) return;

  if (isSolution(current, target, state)) {
    const result = formatResult(state, airportMap, target);

    addResult(results, result, options.maxResults);

    return;
  }

  const neighbors = graph[current] || [];

  for (const edge of neighbors) {
    const next = edge.to;

    if (path.includes(next)) continue;

    const availableFlights = edge?.schedules?.[currentDay] ?? [];

    for (const flight of availableFlights) {
      const validFlight = canTakeFlight(currentTime, flight.departure);

      if (!validFlight) continue;

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

              departure: flight.departure,
              arrival: flight.arrival,

              day: currentDay,
            },
          ],

          cost: cost + edge.basePrice,

          distance: distance + edge.distance,

          currentDay,

          currentTime: flight.arrival,
        },
        context
      );
    }
  }
}

function canTakeFlight(currentTime, departureTime) {
  const currentMinutes = convertTimeToMinutes(currentTime);

  const departureMinutes = convertTimeToMinutes(departureTime);

  return departureMinutes >= currentMinutes + MIN_LAYOVER_MINUTES;
}

function convertTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function canContinue(state, options, results) {
  const { cost, path } = state;

  const { budget, maxStops, maxResults } = options;

  if (cost > budget + 200) return false;

  if (path.length > maxStops + 1) return false;

  if (results.length >= maxResults) {
    const worst = results[results.length - 1];

    if (worst && cost > worst.cost) return false;
  }

  return true;
}

function isSolution(current, target, state) {
  return current === target && state.path.length > 1;
}

function formatResult(state, airportMap, target) {
  const baseCost = state.cost;
  const penalty = calculatePenalty(state, airportMap, target);

  return {
    path: state.path,
    pathKey: state.path.join("->"),

    flights: state.flights,

    cost: Math.round(baseCost),
    distance: Math.round(state.distance),
    score: Math.round(baseCost + penalty),
  };
}

function calculatePenalty(state, airportMap, target) {
  let penalty = 0;

  const path = state.path;

  penalty += path.length * 15;

  for (let i = 0; i < path.length - 1; i++) {
    const current = airportMap[path[i]];

    const next = airportMap[path[i + 1]];

    const targetAirport = airportMap[target];

    if (!current || !next || !targetAirport) continue;

    const distCurrent = haversine(
      current.location.lat,
      current.location.lon,
      targetAirport.location.lat,
      targetAirport.location.lon
    );

    const distNext = haversine(
      next.location.lat,
      next.location.lon,
      targetAirport.location.lat,
      targetAirport.location.lon
    );

    if (distNext > distCurrent) {
      penalty += 50;
    }
  }

  return penalty;
}

function addResult(results, newResult, maxResults) {
  const exists = results.some(r => r.pathKey === newResult.pathKey);

  if (exists) return;

  results.push(newResult);

  results.sort((a, b) => a.score - b.score);

  if (results.length > maxResults) {
    results.pop();
  }
}
