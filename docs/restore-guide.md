# Backup Restore & Troubleshooting Guide

## Manual Restore Steps
1. Open **Settings → Data & Backups** in the desktop app and list recent snapshots.
2. Trigger `Create Backup` before restoring to capture the current state (`app-pre-restore-<timestamp>.sqlite` is saved automatically).
3. Select the snapshot to restore and confirm with the owner PIN. The app replaces `app.sqlite` with the snapshot and logs the action via `backup.service.Restore`.
4. Re-launch the application to reopen connections to the refreshed database.

## Verifying a Restore
- **Check latest backup records**: `make shell` → `sqlite3 data/app.sqlite 'SELECT filename, created_at FROM backups ORDER BY created_at DESC LIMIT 5;'`
- **Integrity check**: run `sqlite3 data/app.sqlite 'PRAGMA integrity_check;'` to ensure no corruption after the swap.
- **Application smoke test**: execute `make dev` and load the Products, POS, Sales, and Reports pages to confirm data consistency.

## Common Issues
| Symptom | Resolution |
| --- | --- |
| Restore fails with `backup not found` | Verify the snapshot still exists under `backups/` (retention may have pruned older files). Re-run backup or copy the file back into the directory. |
| Owner PIN rejected | Use **Settings → Owner PIN** to verify the existing PIN. You can clear and reset it if forgotten. |
| POS shows stale inventory after restore | Restart the app to refresh in-memory caches or run `make build && make dev` to ensure both backend and frontend restart. |
| Logs missing | Export logs via **Settings → Export Logs** or tail the console output (`SHOPMATE_ENV=development make dev`). |

## Crash Recovery Checklist
1. `make lint && make test` – confirm unit/integration tests still pass.
2. Inspect `backup.Record` metadata via the Wails settings panel for the expected snapshot.
3. Use `sqlite3` to compare row counts before/after restore (e.g., `SELECT COUNT(*) FROM sales;`).
4. Capture any anomalies as GitHub issues with log excerpts and backup filenames.
