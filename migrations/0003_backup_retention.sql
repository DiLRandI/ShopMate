CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    retention_days INTEGER NOT NULL DEFAULT 30,
    updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
);

INSERT INTO backup_settings (id, retention_days)
SELECT 1, 30
WHERE NOT EXISTS (
    SELECT 1 FROM backup_settings WHERE id = 1
);
