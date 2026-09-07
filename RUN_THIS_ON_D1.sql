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
