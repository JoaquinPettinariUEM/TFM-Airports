import fs from "node:fs";
import path from "node:path";
import axios from "axios";

import { normalizeCity } from "../utils/normalizeCity.js";

const CITY_IMAGES_DIR = path.resolve("public/cities");

export async function getCityImage(city) {
  const normalized = normalizeCity(city);

  const imagePath = path.join(CITY_IMAGES_DIR, `${normalized}.jpg`);

  if (fs.existsSync(imagePath)) {
    return imagePath;
  }

  const response = await axios.get("https://api.unsplash.com/search/photos", {
    params: {
      query: city,
      per_page: 1,
    },
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  });

  const imageUrl = response.data.results?.[0]?.urls?.regular;

  if (!imageUrl) {
    throw new Error("Image not found");
  }

  const imageResponse = await axios.get(imageUrl, {
    responseType: "stream",
  });

  fs.mkdirSync(CITY_IMAGES_DIR, { recursive: true });

  const writer = fs.createWriteStream(imagePath);

  imageResponse.data.pipe(writer);

  console.log("Descargando foto de ", city);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return imagePath;
}
