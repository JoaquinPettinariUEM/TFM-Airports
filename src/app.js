import express from "express";
import routes from "./routes/routes.js";
import airports from "./routes/airports.js";
import cityImages from "./routes/cityImage.js";
import itineraries from "./routes/itineraries.js";
import cors from "cors";
import path from "node:path";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: corsOrigin }));

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "TFM Airports API",
    status: "ok",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/cities", express.static(path.resolve("public/cities")));
app.use("/routes", routes);
app.use("/itineraries", itineraries);
app.use("/airports", airports);
app.use("/city-images", cityImages);

export default app;
