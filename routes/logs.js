const express = require("express");
const { pool } = require("../db");

const router = express.Router();

function requireSiteAdmin(req, res, next) {
  const siteRole = req.headers["x-user-site-role"];
  if (!["super_admin", "site_admin"].includes(siteRole)) {
    return res.status(403).json({ error: "Site admin access required" });
  }
  next();
}

router.get("/", requireSiteAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM logs ORDER BY created_at DESC LIMIT 200"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
