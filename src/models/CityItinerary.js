import mongoose from "mongoose";

const ItineraryActivitySchema = new mongoose.Schema(
  {
    time: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
    mapQuery: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    moreInfoUrl: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const ItineraryDaySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    activities: {
      type: [ItineraryActivitySchema],
      default: [],
    },
  },
  { _id: false },
);

const CityItinerarySchema = new mongoose.Schema(
  {
    citySlug: {
      type: String,
      required: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 1,
      max: 14,
    },
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    summary: {
      type: String,
      default: "",
    },
    shortDescription: {
      type: String,
      default: "",
    },
    budgetLevel: {
      type: String,
      default: "",
    },
    estimatedDailyBudget: {
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
      currency: {
        type: String,
        default: "EUR",
      },
    },
    currency: {
      type: String,
      default: "",
    },
    bestSeason: {
      type: String,
      default: "",
    },
    averageWeather: {
      type: String,
      default: "",
    },
    heroImage: {
      type: String,
      default: null,
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    tips: {
      type: [String],
      default: [],
    },
    itineraryDays: {
      type: [ItineraryDaySchema],
      default: [],
    },
    historicalInfoUrl: {
      type: String,
      default: null,
    },
    mapUrl: {
      type: String,
      default: null,
    },
    sourceModel: {
      type: String,
      default: "",
    },
    promptVersion: {
      type: String,
      default: "v1",
    },
    cachedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

CityItinerarySchema.index(
  {
    citySlug: 1,
    country: 1,
    days: 1,
  },
  {
    unique: true,
  },
);

export const CityItinerary = mongoose.model("CityItinerary", CityItinerarySchema);
