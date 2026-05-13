import express from "express";
import { getRouteById, getRoutes } from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.get("/:id", getRouteById);

export default router;
