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


-- Approval emails
-- Approval notification email addresses managed from the Group Admin page.
CREATE TABLE IF NOT EXISTS approver_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);
