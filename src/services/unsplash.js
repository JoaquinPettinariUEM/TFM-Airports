import axios from "axios";

export async function getCityGalleryImages({ city, country, limit = 4 }) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return [];
  }

  const response = await axios.get("https://api.unsplash.com/search/photos", {
    params: {
      query: `${city} ${country} city travel`,
      per_page: limit,
      orientation: "landscape",
      content_filter: "high",
    },
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  });

  return (response.data.results ?? [])
    .map((result) => result?.urls?.regular || result?.urls?.small || null)
    .filter(Boolean)
    .slice(0, limit);
}
