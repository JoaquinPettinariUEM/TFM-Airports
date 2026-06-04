import express from "express";
import { getCityItinerary } from "../controllers/itinerary.controller.js";

const router = express.Router();

router.get("/", getCityItinerary);

export default router;
