import express from "express";
import { getRoutes } from "../controllers/route.js";

const router = express.Router();

router.get("/", getRoutes);

export default router;
