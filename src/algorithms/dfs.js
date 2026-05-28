import { addDays, format, startOfDay } from "date-fns";
import { WEEK_DAYS } from "../utils/date.js";
import { haversine } from "../utils/haversine.js";
import {
  addResult,
  canContinue,
  findFlightsAfterDate,
  formatResult,
  isSolution,
} from "./extras.js";

export function findRoutes(graph, start, target, airportMap, options = {}) {
  const parsedTemplate = sanitizePathTemplate(
    parsePathTemplate(options.pathTemplate, start, target),
    graph,
    start,
    target,
  );
  const stayDaysByAirport = parseStayOverrides(options.via, options.stayDays);
  const stayDaysTemplate = parseStayDaysTemplate(options.stayDaysTemplate);

  const config = {
    budget: Infinity,
    minStops: 1,
    maxStops: 4,
    maxResults: 2000,
    maxSearchMs: 60000,

    startDate: new Date().toISOString(),
    tripDays: 7,
    ...options,
    pathTemplate: parsedTemplate,
    stayDaysByAirport,
    stayDaysTemplate,
  };

  const startDate = startOfDay(new Date(config.startDate));

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
      startedAt: Date.now(),
    },
  );

  return results.sort((a, b) => {
    const stopDistanceA = Math.abs(a.path.length - 2 - config.maxStops);
    const stopDistanceB = Math.abs(b.path.length - 2 - config.maxStops);

    if (stopDistanceA !== stopDistanceB) {
      return stopDistanceA - stopDistanceB;
    }

    if (a.score !== b.score) {
      return a.score - b.score;
    }

    return a.cost - b.cost;
  });
}

function dfs(graph, current, target, state, context) {
  const { path, flights, cost, distance, currentDateTime } = state;

  const { results, options, airportMap, endDate, startedAt } = context;

  if (Number.isFinite(options.maxSearchMs) && Date.now() - startedAt > options.maxSearchMs) {
    return;
  }

  if (!canContinue(state, options, results)) {
    return;
  }

  if (currentDateTime > endDate) {
    return;
  }

  if (isSolution(current, target, state, options, { endDate, airportMap })) {
    const result = formatResult(state, airportMap, target);

    addResult(results, result, options.maxResults, options);

    return;
  }

  const neighbors = sortNeighbors(graph[current] || [], current, target, airportMap);

  for (const edge of neighbors) {
    const next = edge.to;
    const nextIndex = path.length;

    if (!matchesTemplateAtIndex(options.pathTemplate, nextIndex, next)) continue;

    if (path.includes(next)) continue;
    if (isSameDestinationCityDifferentAirport(next, target, airportMap)) continue;

    const availableFlights = findFlightsAfterDate(edge, currentDateTime, endDate);

    for (const flight of availableFlights) {
      const arrivalDate = new Date(flight.departureDate.getTime() + flight.durationMinutes * 60000);

      const stayDays = resolveStayDays(
        options.stayDaysTemplate?.[nextIndex] ??
          options.stayDaysByAirport?.get(next) ??
          airportMap[next]?.recommendedStayDays,
      );
      const nextSearchDate =
        next === target
          ? startOfDay(arrivalDate)
          : startOfDay(addDays(startOfDay(arrivalDate), stayDays + 1));

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
        context,
      );
    }
  }
}

function isSameDestinationCityDifferentAirport(next, target, airportMap) {
  if (next === target) return false;

  const nextAirport = airportMap[next];
  const targetAirport = airportMap[target];
  if (!nextAirport || !targetAirport) return false;

  const nextCity = String(nextAirport.city ?? "")
    .trim()
    .toLowerCase();
  const targetCity = String(targetAirport.city ?? "")
    .trim()
    .toLowerCase();
  const nextCountry = String(nextAirport.country ?? "")
    .trim()
    .toLowerCase();
  const targetCountry = String(targetAirport.country ?? "")
    .trim()
    .toLowerCase();

  return nextCity === targetCity && nextCountry === targetCountry;
}

function sortNeighbors(neighbors, current, target, airportMap) {
  const currentAirport = airportMap[current];
  const targetAirport = airportMap[target];
  if (!currentAirport || !targetAirport) {
    return neighbors;
  }

  const ranked = [...neighbors].map((edge) => {
    const nextAirport = airportMap[edge.to];
    if (!nextAirport) {
      return { edge, rank: Number.POSITIVE_INFINITY };
    }

    // 1) Llegar al destino cuanto antes.
    const isTarget = edge.to === target ? -100000 : 0;

    // 2) Favorecer hubs relevantes para evitar ramas raras tempranas.
    const tierBoost =
      nextAirport.cityTier === "major" ? -400 : nextAirport.cityTier === "tourist" ? -150 : 0;

    // 3) Cercania al destino (menos desvio).
    const distanceToTarget = haversine(
      nextAirport.location.lat,
      nextAirport.location.lon,
      targetAirport.location.lat,
      targetAirport.location.lon,
    );

    // 4) Costo bajo ayuda, pero menor peso que direccion/tier.
    const pricePenalty = edge.basePrice * 0.6;

    return {
      edge,
      rank: isTarget + tierBoost + distanceToTarget + pricePenalty,
    };
  });

  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.map((item) => item.edge);
}

function sanitizePathTemplate(template, graph, start, target) {
  if (!Array.isArray(template) || !template.length) return template;

  return template.map((token, index) => {
    if (index === 0) return String(start).toUpperCase();
    if (index === template.length - 1) return String(target).toUpperCase();
    if (token === "?") return token;

    const airportEdges = graph?.[token];
    if (!Array.isArray(airportEdges) || airportEdges.length === 0) {
      return "?";
    }

    return token;
  });
}

function parsePathTemplate(pathTemplate, fallbackStart, fallbackTarget) {
  if (!pathTemplate || typeof pathTemplate !== "string") return null;
  const tokens = pathTemplate
    .split("->")
    .map((token) => String(token).trim().toUpperCase())
    .filter(Boolean);

  if (tokens.length < 2) return null;
  if (tokens[0] !== String(fallbackStart).toUpperCase()) return null;
  if (tokens[tokens.length - 1] !== String(fallbackTarget).toUpperCase()) return null;

  return tokens;
}

function parseStayOverrides(viaRaw, stayDaysRaw) {
  const map = new Map();
  const via = String(viaRaw || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const stayDays = String(stayDaysRaw || "")
    .split(",")
    .map((value) => Number(value));

  via.forEach((airportCode, index) => {
    const parsedStay = Number(stayDays[index]);
    if (!Number.isFinite(parsedStay)) return;
    map.set(airportCode, Math.max(0, Math.min(6, Math.round(parsedStay))));
  });

  return map;
}

function matchesTemplateAtIndex(template, index, airportCode) {
  if (!template || !Array.isArray(template)) return true;
  if (index >= template.length) return false;
  const token = template[index];
  if (!token || token === "?") return true;
  return token === String(airportCode).toUpperCase();
}

function parseStayDaysTemplate(raw) {
  if (!raw || typeof raw !== "string") return null;
  const parsed = raw
    .split(",")
    .map((value) => Number(value))
    .map((value) => (Number.isFinite(value) ? Math.max(0, Math.min(6, Math.round(value))) : null));
  return parsed.length ? parsed : null;
}

function resolveStayDays(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(0, Math.min(6, Math.round(parsed)));
}
