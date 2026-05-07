import { getCityImage } from "../services/cityImage.js";

export async function getCityImageController(req, res) {
  try {
    const { city } = req.params;

    const imagePath = await getCityImage(city);

    return res.sendFile(imagePath);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to get city image",
    });
  }
}
