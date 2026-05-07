import express from "express";

import { getCityImageController } from "../controllers/cityImage.controller.js";

const router = express.Router();

router.get("/:city", getCityImageController);

export default router;
