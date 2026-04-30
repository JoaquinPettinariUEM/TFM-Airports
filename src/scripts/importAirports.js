import Airport from "../models/Airport.js";
import { buildPath, readCSV } from "../utils/csv.js";

const filePath = buildPath(import.meta.url, "../dataMock/airports_clean.csv");

export function mapAirport(a) {
  return {
    _id: a.ident,
    name: a.name,
    location: {
      lat: Number(a.lat),
      lon: Number(a.lon),
    },
    country: a.country,
    city: a.municipality,
  };
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

  const mapped = raw.map(mapAirport).filter(Boolean);

  await insertAirports(mapped);
}
