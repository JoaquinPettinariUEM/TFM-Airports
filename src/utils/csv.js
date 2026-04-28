import fs from "node:fs";
import csv from "csv-parser";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function buildPath(metaUrl, relativePath) {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = dirname(__filename);
  return join(__dirname, relativePath);
}

export async function createCSVWithOnlyLargeAirports() {
  const results = await readCSV(buildPath(import.meta.url, "../../airports.csv"), true);
  createCSVWithAirports(results);
}

export function createCSVWithAirports(results) {
  const headers = ["id", "ident", "name", "lat", "lon", "country", "municipality"];

  const lines = results.map(a =>
    [
      a.id,
      a.ident,
      a.name,
      a.latitude_deg,
      a.longitude_deg,
      a.iso_country,
      a.municipality,
    ].join(",")
  );

  const csvContent = [headers.join(","), ...lines].join("\n");

  fs.writeFileSync("airports_clean.csv", csvContent);
}

export function readCSV(csvFile, findOnlyLargeAirports = false) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvFile)
      .pipe(csv())
      .on("data", row => {
        if (!findOnlyLargeAirports) {
          results.push(row);
          return;
        }

        if (row.type === "large_airport") {
          results.push(row);
        }
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}
