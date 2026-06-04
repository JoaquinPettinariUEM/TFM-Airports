import { normalizeCity } from "./normalizeCity.js";

export function buildCityItineraryCacheKey({ city, country, days }) {
  return `${normalizeCity(city)}-${normalizeCity(country)}-${Number(days)}`;
}
