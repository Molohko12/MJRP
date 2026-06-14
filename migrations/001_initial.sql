-- Majestic RP Government Portal — initial schema
-- Run via: npm run migrate (requires DATABASE_URL)

CREATE TABLE IF NOT EXISTS ministries (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  ministry_id VARCHAR(64) REFERENCES ministries(id),
  title VARCHAR(255) NOT NULL,
  level INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL UNIQUE,
  position VARCHAR(255),
  ministry_id VARCHAR(64) REFERENCES ministries(id),
  role_id VARCHAR(64) REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(64) REFERENCES roles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  applicant_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  experience VARCHAR(64),
  contact VARCHAR(255),
  notes TEXT,
  status VARCHAR(32) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  complainant_name VARCHAR(255) NOT NULL,
  target_employee VARCHAR(255) NOT NULL,
  incident_date DATE,
  description TEXT,
  contact VARCHAR(255),
  status VARCHAR(32) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  actor VARCHAR(255),
  action VARCHAR(128),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);

-- Seed ministries
INSERT INTO ministries (id, name) VALUES
  ('governor', 'Администрация Губернатора'),
  ('justice', 'Министерство Юстиции'),
  ('defense', 'Министерство Обороны'),
  ('advocacy', 'Адвокатура'),
  ('secret_service', 'Секретная служба'),
  ('finance', 'Министерство Финансов'),
  ('health', 'Министерство Здравоохранения')
ON CONFLICT (id) DO NOTHING;

-- Seed demo users
INSERT INTO users (full_name, position, ministry_id, role_id) VALUES
  ('Иван Петров', 'Губернатор', 'governor', 'governor'),
  ('Мария Сидорова', 'Руководитель Аппарата', 'governor', 'chief_of_staff'),
  ('Алексей Козлов', 'Министр Юстиции', 'justice', 'justice_minister')
ON CONFLICT (full_name) DO NOTHING;
