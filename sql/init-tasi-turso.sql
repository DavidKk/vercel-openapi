-- TASI Saudi daily data in Turso (libsql).
-- Run once via Turso CLI: turso db shell <db-name> < init-tasi-turso.sql
-- Or paste in Turso dashboard SQL editor.

-- One row per (date, company code). payload = full JSON of company daily record.
CREATE TABLE IF NOT EXISTS tasi_company_daily (
  date TEXT NOT NULL,
  code TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (date, code)
);
CREATE INDEX IF NOT EXISTS idx_tasi_company_daily_code_date ON tasi_company_daily(code, date);

-- One row per date. payload = full JSON of market summary.
CREATE TABLE IF NOT EXISTS tasi_market_summary (
  date TEXT NOT NULL PRIMARY KEY,
  payload TEXT NOT NULL
);
