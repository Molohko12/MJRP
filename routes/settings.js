const express = require("express");
const { pool, writeLog } = require("../db");

const router = express.Router();
const SETTINGS_KEY = "portal_config";

const DEFAULT_MINISTRIES = [
  { id: "governor", name: "Администрация Губернатора", roles: [
    { id: "governor", title: "Губернатор", level: 100 },
    { id: "deputy_governor", title: "Заместитель Губернатора", level: 90 },
  ]},
  { id: "justice", name: "Министерство Юстиции", roles: [
    { id: "justice_minister", title: "Министр Юстиции", level: 80 },
  ]},
];

function requireSuperAdmin(req, res, next) {
  if (req.headers["x-user-site-role"] !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
}

function mergeDefaults(data) {
  const ministries = data?.ministries?.length ? data.ministries : DEFAULT_MINISTRIES;
  const applicationStatuses = data?.applicationStatuses?.length
    ? data.applicationStatuses
    : [
        { id: "new", label: "Новое", cssClass: "status-new", isInitial: true },
        { id: "approved", label: "Одобрено", cssClass: "status-approved" },
        { id: "rejected", label: "Отклонено", cssClass: "status-rejected" },
      ];
  const complaintStatuses = data?.complaintStatuses?.length
    ? data.complaintStatuses
    : [
        { id: "new", label: "Новое", cssClass: "status-new", isInitial: true },
        { id: "in_progress", label: "В работе", cssClass: "status-review", actionLabel: "В работу" },
        { id: "closed", label: "Закрыто", cssClass: "status-approved", actionLabel: "Закрыть" },
      ];
  return { ministries, applicationStatuses, complaintStatuses };
}

async function loadSettings() {
  const result = await pool.query(
    "SELECT value FROM site_settings WHERE key = $1",
    [SETTINGS_KEY]
  );
  if (!result.rowCount) return mergeDefaults({});
  return mergeDefaults(result.rows[0].value);
}

router.get("/", async (_req, res) => {
  try {
    const settings = await loadSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", requireSuperAdmin, async (req, res) => {
  const actor = req.headers["x-user-name"] || "unknown";
  try {
    const current = await loadSettings();
    const next = mergeDefaults({ ...current, ...req.body });

    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(next)]
    );

    await writeLog("Site settings updated", actor, "settings.update");
    res.json(next);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
