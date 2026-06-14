const express = require("express");
const { pool, writeLog } = require("../db");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM complaints ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { complainant_name, target_employee, incident_date, description, contact } = req.body;
  if (!complainant_name || !target_employee) {
    return res.status(400).json({ error: "complainant_name and target_employee are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO complaints (complainant_name, target_employee, incident_date, description, contact)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [complainant_name, target_employee, incident_date || null, description, contact]
    );
    await writeLog(
      `New complaint against ${target_employee} by ${complainant_name}`,
      "citizen",
      "complaint.create"
    );
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
      "UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Not found" });
    await writeLog(`Complaint #${req.params.id} → ${status}`, actor, "complaint.update");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
