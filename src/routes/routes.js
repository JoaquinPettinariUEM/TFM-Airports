import express from "express";
import { getRouteDetails, getRoutes } from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.get("/details", getRouteDetails);

export default router;
