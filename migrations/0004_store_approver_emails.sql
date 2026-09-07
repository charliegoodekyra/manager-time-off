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
