import { buildPath, INITIAL_PATH, readCSV } from "../utils/csv.js";
import { WEEK_DAYS } from "../utils/date.js";
import { haversine } from "../utils/haversine.js";
import { randomBetween } from "../utils/routeBuilder.js";

let routes = null;

export async function createRoutes(airports) {
  console.log("Creating routes with schedules...");

  const routeMap = new Map();

  const allRoutes = await readCSV(buildPath(INITIAL_PATH, "../../routes.dat"));

  const airportMap = new Map();

  airports.forEach(ap => {
    airportMap.set(ap._id, ap);
  });

  routes = allRoutes
    .filter(
      fly => fly.from && fly.to && airportMap.has(fly.from) && airportMap.has(fly.to)
    )
    .map(fly => {
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

        basePrice: calculatePrice(distance),

        schedules: generateSchedules(distance, durationMinutes),
      };
    })
    .filter(Boolean)
    .filter(route => {
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

function calculatePrice(distance) {
  const baseFare = 30;
  const costPerKm = 0.12;

  const randomFactor = 0.8 + Math.random() * 0.4;

  return Math.round((baseFare + distance * costPerKm) * randomFactor);
}

function calculateFlightDuration(distance) {
  const averageSpeedKmH = 780;

  const hours = distance / averageSpeedKmH;

  return Math.max(Math.round(hours * 60), 45);
}

function generateSchedules(distance, durationMinutes) {
  const schedules = {};

  const activeDays = pickActiveDays(distance);

  WEEK_DAYS.forEach(day => {
    if (!activeDays.includes(day)) {
      schedules[day] = [];
      return;
    }

    schedules[day] = generateFlightsForDay(distance, durationMinutes);
  });

  return schedules;
}

function pickActiveDays(distance) {
  let amountOfDays = 2;

  if (distance < 1000) {
    amountOfDays = randomBetween(4, 7);
  } else if (distance < 3000) {
    amountOfDays = randomBetween(2, 5);
  } else {
    amountOfDays = randomBetween(1, 3);
  }

  const shuffled = [...WEEK_DAYS].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, amountOfDays);
}

function generateFlightsForDay(distance, durationMinutes) {
  let amountOfFlights = 1;

  if (distance < 1000) {
    amountOfFlights = randomBetween(1, 3);
  } else if (distance < 3000) {
    amountOfFlights = randomBetween(1, 2);
  }

  const flights = [];

  for (let i = 0; i < amountOfFlights; i++) {
    const departureHour = randomBetween(5, 22);

    const departureMinute = randomMinute();

    const departure = buildTime(departureHour, departureMinute);

    const arrival = addMinutesToTime(departure, durationMinutes);

    flights.push({
      departure,
      arrival,
      durationMinutes,
    });
  }

  return flights.sort((a, b) => a.departure.localeCompare(b.departure));
}

function randomMinute() {
  const validMinutes = [0, 15, 30, 45];

  return validMinutes[Math.floor(Math.random() * validMinutes.length)];
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
