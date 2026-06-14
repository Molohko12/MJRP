const express = require("express");
const { pool, writeLog } = require("../db");

const router = express.Router();

function requireAuditor(req, res, next) {
  const siteRole = req.headers["x-user-site-role"];
  const gameRole = req.headers["x-user-game-role"];
  const allowedSite = ["super_admin"].includes(siteRole);
  const allowedGame = ["governor", "hr_auditor"].includes(gameRole);
  if (!allowedSite && !allowedGame) {
    return res.status(403).json({ error: "HR audit access required" });
  }
  next();
}

router.post("/", requireAuditor, async (req, res) => {
  const { user_name, ministry_id, role_id, role_title, ministry_name } = req.body;
  const actor = req.headers["x-user-name"] || "unknown";

  if (!user_name || !role_id) {
    return res.status(400).json({ error: "user_name and role_id are required" });
  }

  try {
    let userResult = await pool.query("SELECT id FROM users WHERE full_name = $1", [user_name]);

    if (!userResult.rowCount) {
      userResult = await pool.query(
        `INSERT INTO users (full_name, position, ministry_id, role_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [user_name, role_title, ministry_id, role_id]
      );
    } else {
      await pool.query(
        "UPDATE users SET position = $1, ministry_id = $2, role_id = $3 WHERE full_name = $4",
        [role_title, ministry_id, role_id, user_name]
      );
    }

    const userId = userResult.rows[0].id;
    await pool.query(
      "INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)",
      [userId, role_id, actor]
    );

    await writeLog(
      `Role assigned: ${user_name} → ${role_title} (${ministry_name || ministry_id})`,
      actor,
      "role.assign",
      { user_name, ministry_id, role_id }
    );

    res.json({ success: true, user_name, role_id, role_title, ministry_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.full_name, u.position, m.name AS ministry_name, u.role_id
      FROM users u
      LEFT JOIN ministries m ON u.ministry_id = m.id
      ORDER BY u.full_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
