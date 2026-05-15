import { addDays, format, parseISO } from "date-fns";
import { WEEK_DAYS } from "./date.js";

const cityStayMap = {};

export function buildRouteFromPath(path, graph, airportMap, options = {}) {
  const config = {
    startDate: new Date().toISOString(),
    ...options,
  };

  let totalCost = 0;
  let totalDistance = 0;

  let currentDate = parseISO(config.startDate);

  const segments = [];

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    const edge = graph[from]?.find(route => route.to === to);

    if (!edge) return null;

    const destinationAirport = airportMap[to];

    const stayDays = getSuggestedStayDays(destinationAirport.city);

    const availableDate = i === 0 ? currentDate : addDays(currentDate, stayDays);

    const selectedFlight = findNextAvailableFlight(edge, availableDate);

    if (!selectedFlight) return null;

    segments.push({
      from: {
        code: from,
        city: airportMap[from].city,
        country: airportMap[from].country,
        airport: airportMap[from].name,
      },

      to: {
        code: to,
        city: destinationAirport.city,
        country: destinationAirport.country,
        airport: destinationAirport.name,
      },

      departureDate: selectedFlight.departureDate,

      arrivalDate: selectedFlight.arrivalDate,

      flightDurationMinutes: selectedFlight.durationMinutes,

      stayDays,

      price: edge.basePrice,

      distance: edge.distance,
    });

    totalCost += edge.basePrice;
    totalDistance += edge.distance;

    currentDate = parseISO(selectedFlight.arrivalDate);
  }

  return {
    path,

    pathKey: path.join("-"),

    cost: Math.round(totalCost),

    distance: Math.round(totalDistance),

    segments,
  };
}

function findNextAvailableFlight(edge, startDate) {
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = addDays(startDate, dayOffset);

    const weekDay = WEEK_DAYS[date.getDay()];

    const flights = edge.schedules?.[weekDay] ?? [];

    for (const flight of flights) {
      const departureDate = buildDateTime(date, flight.departure);

      const arrivalDate = buildArrivalDateTime(departureDate, flight.durationMinutes);

      return {
        departureDate,

        arrivalDate,

        durationMinutes: flight.durationMinutes,
      };
    }
  }

  return null;
}

function buildDateTime(date, time) {
  return `${format(date, "yyyy-MM-dd")}T${time}`;
}

function buildArrivalDateTime(departureDate, durationMinutes) {
  const departure = new Date(departureDate);

  const arrival = new Date(departure.getTime() + durationMinutes * 60 * 1000);

  return format(arrival, "yyyy-MM-dd'T'HH:mm");
}

function getSuggestedStayDays(city) {
  if (cityStayMap[city]) {
    return cityStayMap[city];
  }

  const stayDays = randomBetween(2, 4);

  cityStayMap[city] = stayDays;

  return stayDays;
}

export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
