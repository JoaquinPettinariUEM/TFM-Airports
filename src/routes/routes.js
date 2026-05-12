import express from "express";
import { getRoutes } from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.get("/:id", getRoutes);

export default router;
