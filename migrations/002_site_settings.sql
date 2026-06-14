-- Site settings (editable by super_admin without code changes)
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES (
  'portal_config',
  '{
    "ministries": [],
    "applicationStatuses": [
      {"id": "new", "label": "Новое", "cssClass": "status-new", "isInitial": true},
      {"id": "approved", "label": "Одобрено", "cssClass": "status-approved"},
      {"id": "rejected", "label": "Отклонено", "cssClass": "status-rejected"}
    ],
    "complaintStatuses": [
      {"id": "new", "label": "Новое", "cssClass": "status-new", "isInitial": true},
      {"id": "in_progress", "label": "В работе", "cssClass": "status-review", "actionLabel": "В работу"},
      {"id": "closed", "label": "Закрыто", "cssClass": "status-approved", "actionLabel": "Закрыть"}
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
