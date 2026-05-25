import { addDays } from "date-fns";
import { haversine } from "../utils/haversine.js";
import { WEEK_DAYS } from "../utils/date.js";

const MIN_LAYOVER_MINUTES = 120;

export function canContinue(state, options, results) {
  const { cost, path } = state;

  const { budget, maxStops, maxResults } = options;

  if (cost > budget + 200) return false;

  // path = airports visited. Flights = path.length - 1. Stops = flights - 1.
  // Therefore, max flights allowed = maxStops + 1 => path.length <= maxStops + 2.
  if (path.length > maxStops + 2) return false;

  if (results.length >= maxResults) {
    const worst = results[results.length - 1];

    if (worst && cost > worst.cost) return false;
  }

  return true;
}

export function isSolution(current, target, state, options) {
  if (current !== target || state.path.length <= 1) {
    return false;
  }

  const stops = state.path.length - 2;
  const minStops = Number.isFinite(options?.minStops) ? Number(options.minStops) : 1;

  return stops >= minStops;
}

export function formatResult(state, airportMap, target) {
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

export function calculatePenalty(state, airportMap, target) {
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
      targetAirport.location.lon,
    );

    const distNext = haversine(
      next.location.lat,
      next.location.lon,
      targetAirport.location.lat,
      targetAirport.location.lon,
    );

    if (distNext > distCurrent) {
      penalty += 50;
    }
  }

  return penalty;
}

export function addResult(results, newResult, maxResults) {
  const exists = results.some((r) => r.pathKey === newResult.pathKey);

  if (exists) return;

  results.push(newResult);

  results.sort((a, b) => a.score - b.score);

  if (results.length > maxResults) {
    results.pop();
  }
}

export function findFlightsAfterDate(edge, currentDateTime, endDate) {
  const results = [];
  const effectiveEndDate = endDate instanceof Date ? endDate : addDays(currentDateTime, 14);
  const remainingMs = effectiveEndDate.getTime() - currentDateTime.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const lookAheadDays = Math.min(14, remainingDays + 1);

  for (let dayOffset = 0; dayOffset < lookAheadDays; dayOffset++) {
    const date = addDays(currentDateTime, dayOffset);

    const weekday = WEEK_DAYS[date.getDay()];

    const flights = edge.schedules?.[weekday] ?? [];

    for (const flight of flights) {
      const departureDate = buildFlightDate(date, flight.departure);

      const diffMinutes = (departureDate.getTime() - currentDateTime.getTime()) / 60000;

      if (diffMinutes < MIN_LAYOVER_MINUTES) {
        continue;
      }

      if (departureDate > effectiveEndDate) {
        continue;
      }

      results.push({
        ...flight,
        departureDate,
      });
    }
  }

  return results;
}

export function buildFlightDate(baseDate, time) {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date(baseDate);

  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}
