import express from "express";
import routes from "./routes/routes.js";
import airports from "./routes/airports.js";
import cityImages from "./routes/cityImage.js";
import cors from "cors";

const app = express();
app.use(cors());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());
app.use("/routes", routes);
app.use("/airports", airports);
app.use("/city-images", cityImages);

export default app;
