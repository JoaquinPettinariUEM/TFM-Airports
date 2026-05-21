import mongoose from "mongoose";

const airportSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  ident: String,
  name: String,
  location: {
    lat: Number,
    lon: Number,
  },
  country: String,
  city: String,
  isHub: Boolean,
  cityTier: {
    type: String,
    enum: ["standard", "tourist", "major"],
    default: "standard",
  },
  popularityScore: {
    type: Number,
    default: 40,
  },
  recommendedStayDays: {
    type: Number,
    default: 2,
  },
});

export default mongoose.model("Airport", airportSchema);
