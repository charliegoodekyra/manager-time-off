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
