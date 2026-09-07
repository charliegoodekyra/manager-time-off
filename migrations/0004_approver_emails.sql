-- Approval notification email addresses managed from the Group Admin page.
CREATE TABLE IF NOT EXISTS approver_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);
