import Airport from "../models/Airport.js";

export async function getAirports(req, res) {
  const { query = "" } = req.query;

  const airports = await Airport.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { city: { $regex: query, $options: "i" } },
      { _id: { $regex: query, $options: "i" } },
    ],
  }).limit(20);

  const mapped = airports.map(a => ({
    id: a._id,
    name: a.name,
    city: a.city,
    country: a.country,
    label: `${a.city} (${a._id}) - ${a.country}`,
  }));

  res.json(mapped);
}
