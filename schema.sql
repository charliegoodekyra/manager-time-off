PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  email TEXT,
  calendar_name TEXT NOT NULL DEFAULT 'Manager Holiday Calendar',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS managers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(store_id, name),
  FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  manager_id INTEGER NOT NULL,
  manager_name TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK(request_type IN ('HOLIDAY','DAY OFF')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED','BLOCKED')),
  conflict_date TEXT,
  notes TEXT,
  calendar_event_id TEXT,
  calendar_sync_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  submitted_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  FOREIGN KEY(store_id) REFERENCES stores(id),
  FOREIGN KEY(manager_id) REFERENCES managers(id)
);

CREATE INDEX IF NOT EXISTS idx_requests_store_status ON requests(store_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_dates ON requests(store_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_managers_store ON managers(store_id, active);

CREATE TABLE IF NOT EXISTS store_credentials (
  store_id INTEGER PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  lookup TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_login_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_limits_expiry ON auth_login_limits(expires_at);


CREATE TABLE IF NOT EXISTS request_month_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  message TEXT,
  blocked_at TEXT NOT NULL,
  UNIQUE(store_id, year, month),
  FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_request_month_blocks_store_month
  ON request_month_blocks(store_id, year, month);


CREATE TABLE IF NOT EXISTS holiday_no_go_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_holiday_no_go_zones_store_dates
  ON holiday_no_go_zones(store_id, start_date, end_date);


-- Store-specific Day Off approval notification recipients.
CREATE TABLE IF NOT EXISTS store_approver_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE(store_id,email)
);

CREATE INDEX IF NOT EXISTS idx_store_approver_emails_store
  ON store_approver_emails(store_id);
