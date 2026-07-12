export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notes (
  slug        TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  parent_slug TEXT,
  sort_order  INTEGER DEFAULT 0,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_files (
  path     TEXT PRIMARY KEY,
  title    TEXT NOT NULL,
  category TEXT NOT NULL,
  time     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_parent  ON notes(parent_slug);
`;
