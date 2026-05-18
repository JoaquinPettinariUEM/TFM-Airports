import mongoose from "mongoose";

const CitySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    summary: {
      type: String,
      default: null,
    },

    image: {
      type: String,
      default: null,
    },

    wikipediaUrl: {
      type: String,
      default: null,
    },

    coordinates: {
      lat: Number,
      lon: Number,
    },

    source: {
      type: String,
      default: "wikipedia",
    },

    cachedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const City = mongoose.model("City", CitySchema);
