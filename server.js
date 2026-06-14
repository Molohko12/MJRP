require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool } = require("./db");

const applicationsRouter = require("./routes/applications");
const complaintsRouter = require("./routes/complaints");
const logsRouter = require("./routes/logs");
const rolesRouter = require("./routes/roles");
const settingsRouter = require("./routes/settings");

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: err.message });
  }
});

app.use("/api/applications", applicationsRouter);
app.use("/api/complaints", complaintsRouter);
app.use("/api/logs", logsRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/settings", settingsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL is not set. API will fail on DB requests.");
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
