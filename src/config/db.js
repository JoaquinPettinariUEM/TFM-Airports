import mongoose from "mongoose";
import { importAirports } from "../scripts/importAirports.js";
import Airport from "../models/Airport.js";
//import { createCSVWithOnlyLargeAirports } from "../utils/csv.js";

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado 🚀");
    // await importAirports();
    // await createCSVWithOnlyLargeAirports();
    // const airports = await Airport.find();
    // console.log(airports);
  } catch (err) {
    console.error("Error conectando a Mongo:", err);
    process.exit(1);
  }
}

export default connectDB;
