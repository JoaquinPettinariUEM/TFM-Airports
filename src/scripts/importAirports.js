import Airport from "../models/Airport.js";
import { buildPath, readCSV } from "../utils/csv.js";

const filePath = buildPath(import.meta.url, "../dataMock/airports_clean.csv");
const cityProfilesPath = buildPath(
  import.meta.url,
  "../data/city_profiles.dat"
);

const DEFAULT_PROFILE = {
  cityTier: "standard",
  popularityScore: 40,
  recommendedStayDays: 2,
};

export function mapAirport(airport, profileMap) {
  const key = buildCityKey(airport.municipality, airport.country);
  const profile = profileMap.get(key) ?? DEFAULT_PROFILE;

  return {
    _id: airport.ident,
    name: airport.name,
    location: {
      lat: Number(airport.lat),
      lon: Number(airport.lon),
    },
    country: airport.country,
    city: airport.municipality,
    cityTier: profile.cityTier,
    popularityScore: profile.popularityScore,
    recommendedStayDays: profile.recommendedStayDays,
  };
}

function buildCityKey(city = "", country = "") {
  return `${normalizeValue(city)}|${normalizeValue(country)}`;
}

function normalizeValue(value = "") {
  return String(value).trim().toLowerCase();
}

async function getCityProfilesMap() {
  const rows = await readCSV(cityProfilesPath);
  const map = new Map();

  rows.forEach((row) => {
    const key = buildCityKey(row.city, row.country);

    if (!key || map.has(key)) return;

    map.set(key, {
      cityTier: row.tier || DEFAULT_PROFILE.cityTier,
      popularityScore:
        Number(row.popularityScore) || DEFAULT_PROFILE.popularityScore,
      recommendedStayDays:
        Number(row.recommendedStayDays) || DEFAULT_PROFILE.recommendedStayDays,
    });
  });

  return map;
}

export async function insertAirports(airports) {
  try {
    await Airport.insertMany(airports, { ordered: false });
    console.log("Aeropuertos insertados 🚀");
  } catch (err) {
    console.error(err);
  }
}

export async function importAirports() {
  const raw = await readCSV(filePath);
  const cityProfilesMap = await getCityProfilesMap();

  const mapped = raw
    .map((airport) => mapAirport(airport, cityProfilesMap))
    .filter(Boolean);

  await insertAirports(mapped);
}
