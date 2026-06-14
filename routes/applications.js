const express = require("express");
const { pool, writeLog } = require("../db");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM applications ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { applicant_name, position, experience, contact, notes } = req.body;
  if (!applicant_name || !position) {
    return res.status(400).json({ error: "applicant_name and position are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO applications (applicant_name, position, experience, contact, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [applicant_name, position, experience, contact, notes]
    );
    await writeLog(`New application from ${applicant_name} for ${position}`, "citizen", "application.create");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  const { status } = req.body;
  const actor = req.headers["x-user-name"] || "unknown";
  try {
    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Not found" });
    await writeLog(`Application #${req.params.id} → ${status}`, actor, "application.update");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
