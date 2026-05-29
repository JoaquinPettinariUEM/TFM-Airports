import express from "express";
import { getPopularRoutes, getRouteDetails, getRoutes } from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.get("/popular", getPopularRoutes);
router.post("/details", getRouteDetails);

export default router;
