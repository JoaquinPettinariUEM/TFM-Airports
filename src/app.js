import express from "express";
import routes from "./routes/routes.js";
import airports from "./routes/airports.js";

const app = express();

app.use(express.json());

app.use("/routes", routes);
app.use("/airports", airports);

export default app;
