import express from "express";
import {
  createSharedRoute,
  getPopularRoutes,
  getRouteDetails,
  getRoutes,
  getSharedRoute,
} from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.get("/popular", getPopularRoutes);
router.post("/share", createSharedRoute);
router.get("/share/:shareId", getSharedRoute);
router.post("/details", getRouteDetails);

export default router;
