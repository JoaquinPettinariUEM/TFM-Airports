import express from "express";

const app = express();

app.use(express.json());

// rutas
app.get("/", (req, res) => {
  res.send("API funcionando");
});

export default app;
