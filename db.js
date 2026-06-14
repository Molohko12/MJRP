require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error:", err);
});

async function writeLog(message, actor = "system", action = null, metadata = null) {
  await pool.query(
    "INSERT INTO logs (message, actor, action, metadata) VALUES ($1, $2, $3, $4)",
    [message, actor, action, metadata ? JSON.stringify(metadata) : null]
  );
}

module.exports = { pool, writeLog };
