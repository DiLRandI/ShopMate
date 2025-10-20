package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"shopmate/internal/domain/backup"
)

// BackupRepository manages persisted backup metadata.
type BackupRepository struct {
	db *sql.DB
}

const backupSettingsRowID = 1

// NewBackupRepository creates a new backup repository.
func NewBackupRepository(db *sql.DB) *BackupRepository {
	return &BackupRepository{db: db}
}

// Record creates a backup record entry.
func (r *BackupRepository) Record(ctx context.Context, filename string, size int64) (*backup.Record, error) {
	res, err := r.db.ExecContext(ctx, `INSERT INTO backups (filename, size_bytes) VALUES (?, ?)`, filename, size)
	if err != nil {
		return nil, fmt.Errorf("insert backup: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("backup last insert id: %w", err)
	}

	row := r.db.QueryRowContext(ctx, `SELECT id, filename, size_bytes, created_at FROM backups WHERE id = ?`, id)
	var (
		rec     backup.Record
		created int64
	)
	if err := row.Scan(&rec.ID, &rec.Filename, &rec.SizeBytes, &created); err != nil {
		return nil, fmt.Errorf("backup scan: %w", err)
	}
	rec.CreatedAt = time.UnixMilli(created).UTC()
	return &rec, nil
}

// Latest fetches most recent backups up to limit.
func (r *BackupRepository) Latest(ctx context.Context, limit int) ([]backup.Record, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, filename, size_bytes, created_at FROM backups ORDER BY created_at DESC, id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("query backups: %w", err)
	}
	defer rows.Close()

	var records []backup.Record
	for rows.Next() {
		var (
			rec     backup.Record
			created int64
		)
		if err := rows.Scan(&rec.ID, &rec.Filename, &rec.SizeBytes, &created); err != nil {
			return nil, fmt.Errorf("scan backup: %w", err)
		}
		rec.CreatedAt = time.UnixMilli(created).UTC()
		records = append(records, rec)
	}
	return records, rows.Err()
}

// Oldest returns the oldest backup records up to limit.
func (r *BackupRepository) Oldest(ctx context.Context, limit int) ([]backup.Record, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, filename, size_bytes, created_at FROM backups ORDER BY created_at ASC, id ASC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("query oldest backups: %w", err)
	}
	defer rows.Close()

	var records []backup.Record
	for rows.Next() {
		var (
			rec     backup.Record
			created int64
		)
		if err := rows.Scan(&rec.ID, &rec.Filename, &rec.SizeBytes, &created); err != nil {
			return nil, fmt.Errorf("scan oldest backup: %w", err)
		}
		rec.CreatedAt = time.UnixMilli(created).UTC()
		records = append(records, rec)
	}
	return records, rows.Err()
}

// Delete removes a backup row by id.
func (r *BackupRepository) Delete(ctx context.Context, id int64) error {
	if _, err := r.db.ExecContext(ctx, `DELETE FROM backups WHERE id = ?`, id); err != nil {
		return fmt.Errorf("delete backup: %w", err)
	}
	return nil
}

// Count returns the total number of backup records.
func (r *BackupRepository) Count(ctx context.Context) (int, error) {
	row := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM backups`)
	var count int
	if err := row.Scan(&count); err != nil {
		return 0, fmt.Errorf("count backups: %w", err)
	}
	return count, nil
}

// RetentionDays retrieves the configured retention window from the database.
func (r *BackupRepository) RetentionDays(ctx context.Context) (int, error) {
	row := r.db.QueryRowContext(ctx, `SELECT retention_days FROM backup_settings WHERE id = ?`, backupSettingsRowID)

	var retention sql.NullInt64
	if err := row.Scan(&retention); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("scan backup retention: %w", err)
	}

	if !retention.Valid || retention.Int64 <= 0 {
		return 0, nil
	}

	return int(retention.Int64), nil
}

// UpdateRetentionDays persists the retention window.
func (r *BackupRepository) UpdateRetentionDays(ctx context.Context, days int) error {
	if days <= 0 {
		return fmt.Errorf("retention days must be > 0 (got %d)", days)
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO backup_settings (id, retention_days, updated_at)
		VALUES (?, ?, (CAST(strftime('%s', 'now') AS INTEGER) * 1000))
		ON CONFLICT(id) DO UPDATE SET
			retention_days = excluded.retention_days,
			updated_at = excluded.updated_at
	`, backupSettingsRowID, days)
	if err != nil {
		return fmt.Errorf("upsert backup retention: %w", err)
	}
	return nil
}
