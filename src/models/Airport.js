import mongoose from "mongoose";

const airportSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  name: String,
  location: {
    lat: Number,
    lon: Number,
  },
  country: String,
  city: String,
  isHub: Boolean,
});

export default mongoose.model("Airport", airportSchema);
