export async function fetchWikipediaCity(city) {
  const encodedCity = encodeURIComponent(city);

  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedCity}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return {
    name: data.title,
    image: data.thumbnail?.source ?? data.originalimage?.source ?? null,
    description: data.description ?? null,
    summary: data.extract ?? null,
    wikipediaUrl: data.content_urls?.desktop?.page ?? null,
    coordinates: data.coordinates
      ? {
          lat: data.coordinates.lat,
          lon: data.coordinates.lon,
        }
      : null,
  };
}

export function createCitySlug(city) {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
