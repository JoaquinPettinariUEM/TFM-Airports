import { buildPath, INITIAL_PATH, readCSV } from "../utils/csv.js";
import { WEEK_DAYS } from "../utils/date.js";
import { haversine } from "../utils/haversine.js";
import { createHash } from "node:crypto";

let routes = null;

export async function createRoutes(airports) {
  console.log("Creating routes with schedules...");

  const routeMap = new Map();

  const allRoutes = await readCSV(
    buildPath(INITIAL_PATH, "../data/routes.dat")
  );

  const airportMap = new Map();

  airports.forEach((ap) => {
    airportMap.set(ap._id, ap);
  });

  routes = allRoutes
    .filter(
      (fly) =>
        fly.from && fly.to && airportMap.has(fly.from) && airportMap.has(fly.to)
    )
    .map((fly) => {
      const fromAirport = airportMap.get(fly.from);
      const toAirport = airportMap.get(fly.to);

      if (!fromAirport || !toAirport) {
        console.warn("Invalid airport coords", fly);
        return null;
      }

      const distance = haversine(
        fromAirport.location.lat,
        fromAirport.location.lon,
        toAirport.location.lat,
        toAirport.location.lon
      );

      const durationMinutes = calculateFlightDuration(distance);

      return {
        from: fly.from,
        to: fly.to,
        distance: Math.round(distance),

        basePrice: calculatePrice(distance, fromAirport, toAirport),

        schedules: generateSchedules(
          fly.from,
          fly.to,
          distance,
          durationMinutes
        ),
      };
    })
    .filter(Boolean)
    .filter((route) => {
      const key = `${route.from}-${route.to}`;

      if (!routeMap.has(key)) {
        routeMap.set(key, true);
        return true;
      }

      return false;
    });

  console.log("Routes generated:", routes.length);
}

export const getRoutes = () => routes;

function calculatePrice(distance, fromAirport, toAirport) {
  const baseFare = 30;
  const costPerKm = 0.12;

  const fromTierMultiplier = getTierMultiplier(fromAirport?.cityTier);
  const toTierMultiplier = getTierMultiplier(toAirport?.cityTier);
  const tierMultiplier = (fromTierMultiplier + toTierMultiplier) / 2;

  const popularityBoost = getPopularityBoost(fromAirport, toAirport);

  return Math.round(
    (baseFare + distance * costPerKm) * tierMultiplier + popularityBoost
  );
}

function getTierMultiplier(cityTier) {
  if (cityTier === "major") return 1.12;

  if (cityTier === "tourist") return 1.06;

  return 1;
}

function getPopularityBoost(fromAirport, toAirport) {
  const fromScore = Number(fromAirport?.popularityScore) || 40;
  const toScore = Number(toAirport?.popularityScore) || 40;

  const averageScore = (fromScore + toScore) / 2;

  return Math.round(Math.max(0, averageScore - 40) * 0.5);
}

function calculateFlightDuration(distance) {
  const averageSpeedKmH = 780;

  const hours = distance / averageSpeedKmH;

  return Math.max(Math.round(hours * 60), 45);
}

function generateSchedules(from, to, distance, durationMinutes) {
  const schedules = {};
  const routeKey = `${from}-${to}`;

  const activeDays = pickActiveDays(routeKey, distance);

  WEEK_DAYS.forEach((day) => {
    if (!activeDays.includes(day)) {
      schedules[day] = [];
      return;
    }

    schedules[day] = generateFlightsForDay(
      routeKey,
      day,
      distance,
      durationMinutes
    );
  });

  return schedules;
}

function pickActiveDays(routeKey, distance) {
  const seed = stableHash(routeKey);
  let minDays = 1;
  let maxDays = 3;

  if (distance < 1000) {
    minDays = 4;
    maxDays = 7;
  } else if (distance < 3000) {
    minDays = 2;
    maxDays = 5;
  }

  const amountOfDays = pickNumberInRange(seed, minDays, maxDays);
  const dayOrder = rotateDeterministically(WEEK_DAYS, seed);

  return dayOrder.slice(0, amountOfDays);
}

function generateFlightsForDay(routeKey, day, distance, durationMinutes) {
  const daySeed = stableHash(`${routeKey}-${day}`);
  let minFlights = 1;
  let maxFlights = 1;

  if (distance < 1000) {
    minFlights = 1;
    maxFlights = 3;
  } else if (distance < 3000) {
    minFlights = 1;
    maxFlights = 2;
  }

  const amountOfFlights = pickNumberInRange(daySeed, minFlights, maxFlights);
  const flights = [];
  const timeSlots = getTimeSlotsByDistance(distance);
  const selectedSlots = rotateDeterministically(timeSlots, daySeed).slice(
    0,
    amountOfFlights
  );

  for (const departure of selectedSlots) {
    const arrival = addMinutesToTime(departure, durationMinutes);

    flights.push({
      departure,
      arrival,
      durationMinutes,
    });
  }

  return flights.sort((a, b) => a.departure.localeCompare(b.departure));
}

function getTimeSlotsByDistance(distance) {
  if (distance < 1000) {
    return ["06:00", "08:30", "11:15", "14:00", "17:10", "20:45"];
  }

  if (distance < 3000) {
    return ["07:15", "12:20", "16:40", "21:05"];
  }

  return ["09:10", "18:35"];
}

function buildTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutesToTime(time, minutesToAdd) {
  const [hours, minutes] = time.split(":").map(Number);

  const totalMinutes = hours * 60 + minutes + minutesToAdd;

  const finalHours = Math.floor(totalMinutes / 60) % 24;
  const finalMinutes = totalMinutes % 60;

  return buildTime(finalHours, finalMinutes);
}

function stableHash(text) {
  const hex = createHash("sha256").update(text).digest("hex");

  return Number.parseInt(hex.slice(0, 8), 16);
}

function pickNumberInRange(seed, min, max) {
  const span = max - min + 1;

  return min + (seed % span);
}

function rotateDeterministically(items, seed) {
  if (!items.length) return [];

  const pivot = seed % items.length;

  return [...items.slice(pivot), ...items.slice(0, pivot)];
}
