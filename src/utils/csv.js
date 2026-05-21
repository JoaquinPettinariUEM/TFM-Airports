import fs from "node:fs";
import csv from "csv-parser";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const INITIAL_PATH = import.meta.url;

export function buildPath(metaUrl, relativePath) {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = dirname(__filename);
  return join(__dirname, relativePath);
}

function buildDataToSaveOnFile(results) {
  const headers = ["id", "ident", "name", "lat", "lon", "country", "municipality"];

  const lines = results.map(a =>
    [a.airportId, a.code, a.name, a.lat, a.lon, a.country, a.city].join(",")
  );

  const csvContent = [headers.join(","), ...lines].join("\n");

  fs.writeFileSync(buildPath(INITIAL_PATH, "../dataMock/airports_clean.csv"), csvContent);
}

export async function createCSVWithOnlyLargeAirports() {
  const results = await readCSV(buildPath(INITIAL_PATH, "../data/airports.dat"));
  buildDataToSaveOnFile(results.slice(0, 1000));
}

export function readCSV(csvFile) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", row => {
        results.push(row);
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}
