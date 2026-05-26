import { addDays, endOfDay, startOfDay } from "date-fns";
import { haversine } from "../utils/haversine.js";
import { WEEK_DAYS } from "../utils/date.js";

export function canContinue(state, options, results) {
  const { path } = state;

  const { maxStops } = options;

  // path = airports visited. Flights = path.length - 1. Stops = flights - 1.
  // Therefore, max flights allowed = maxStops + 1 => path.length <= maxStops + 2.
  if (path.length > maxStops + 2) return false;

  return true;
}

export function isSolution(current, target, state, options, context = {}) {
  if (current !== target || state.path.length <= 1) {
    return false;
  }

  const stops = state.path.length - 2;
  const minStops = Number.isFinite(options?.minStops) ? Number(options.minStops) : 1;
  if (stops < minStops) {
    return false;
  }

  // Ciudad final: validar que su estadia recomendada entre en la ventana del viaje.
  const { endDate, airportMap } = context;
  const lastFlight = state.flights[state.flights.length - 1];
  const targetAirport = airportMap?.[target];
  if (!lastFlight || !endDate || !targetAirport) {
    return true;
  }

  const finalStayDays = normalizeStayDays(targetAirport.recommendedStayDays);
  const arrivalDate = new Date(lastFlight.arrivalDate);
  const completionDate = addDays(arrivalDate, finalStayDays);

  return completionDate <= endOfDay(endDate);
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

  for (let i = 1; i < path.length - 1; i++) {
    const stopAirport = airportMap[path[i]];
    if (!stopAirport) continue;

    if (stopAirport.cityTier === "major") {
      penalty -= 35;
    } else if (stopAirport.cityTier === "tourist") {
      penalty -= 12;
    } else {
      penalty += 10;
    }
  }

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
      const detourDelta = distNext - distCurrent;
      penalty += 35 + Math.min(70, Math.round(detourDelta * 0.03));
    }
  }

  return penalty;
}

export function addResult(results, newResult, maxResults, options = {}) {
  const exists = results.some((r) => r.pathKey === newResult.pathKey);

  if (exists) return;

  results.push(newResult);

  results.sort((a, b) => a.score - b.score);

  if (results.length > maxResults) {
    results.pop();
  }
}

export function findFlightsAfterDate(edge, currentDateTime, endDate) {
  const travelDay = startOfDay(currentDateTime);
  const effectiveEndDate = endDate instanceof Date ? endDate : addDays(currentDateTime, 14);
  if (travelDay > endOfDay(effectiveEndDate)) {
    return [];
  }

  const weekday = WEEK_DAYS[travelDay.getDay()];
  const flights = edge.schedules?.[weekday] ?? [];

  return flights.map((flight) => ({
    ...flight,
    departureDate: buildFlightDate(travelDay, flight.departure),
  }));
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

function normalizeStayDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(6, Math.round(parsed)));
}
