package sqlite

import (
	"context"
	"database/sql"
	"fmt"

	"shopmate/internal/domain/backup"
)

// BackupRepository manages persisted backup metadata.
type BackupRepository struct {
	db *sql.DB
}

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
	var rec backup.Record
	if err := row.Scan(&rec.ID, &rec.Filename, &rec.SizeBytes, &rec.CreatedAt); err != nil {
		return nil, fmt.Errorf("backup scan: %w", err)
	}
	return &rec, nil
}

// Latest fetches most recent backups up to limit.
func (r *BackupRepository) Latest(ctx context.Context, limit int) ([]backup.Record, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, filename, size_bytes, created_at FROM backups ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("query backups: %w", err)
	}
	defer rows.Close()

	var records []backup.Record
	for rows.Next() {
		var rec backup.Record
		if err := rows.Scan(&rec.ID, &rec.Filename, &rec.SizeBytes, &rec.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan backup: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}
