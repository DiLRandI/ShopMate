package backup

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	"shopmate/internal/domain/backup"
)

const defaultRetention = 7

// Service manages database backup lifecycle.
type Service struct {
	repo      *sqlite.BackupRepository
	dbPath    string
	backupDir string
	retention int
}

// NewService constructs a backup service rooted at the database path.
func NewService(repo *sqlite.BackupRepository, dbPath string) *Service {
	dir := filepath.Join(filepath.Dir(dbPath), "backups")
	return &Service{
		repo:      repo,
		dbPath:    dbPath,
		backupDir: dir,
		retention: defaultRetention,
	}
}

// SetRetention configures how many backup files to keep on disk.
func (s *Service) SetRetention(count int) {
	if count > 0 {
		s.retention = count
	}
}

// Create snapshot copies the SQLite db into backupDir and records metadata.
func (s *Service) Create(ctx context.Context) (*backup.Record, error) {
	if err := os.MkdirAll(s.backupDir, 0o755); err != nil {
		return nil, fmt.Errorf("create backup dir: %w", err)
	}

	src, err := os.Open(s.dbPath)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	defer src.Close()

	filename := fmt.Sprintf("backup_%s.sqlite", time.Now().Format("20060102_150405"))
	targetPath := filepath.Join(s.backupDir, filename)

	dst, err := os.Create(targetPath)
	if err != nil {
		return nil, fmt.Errorf("create backup file: %w", err)
	}

	size, copyErr := io.Copy(dst, src)
	closeErr := dst.Close()
	if copyErr != nil {
		return nil, fmt.Errorf("copy backup: %w", copyErr)
	}
	if closeErr != nil {
		return nil, fmt.Errorf("close backup: %w", closeErr)
	}

	record, err := s.repo.Record(ctx, filename, size)
	if err != nil {
		return nil, err
	}

	if err := s.applyRetention(); err != nil {
		return record, err
	}

	return record, nil
}

// Latest returns recorded backups up to limit.
func (s *Service) Latest(ctx context.Context, limit int) ([]backup.Record, error) {
	if limit <= 0 {
		limit = s.retention
	}
	return s.repo.Latest(ctx, limit)
}

func (s *Service) applyRetention() error {
	records, err := s.repo.Latest(context.Background(), s.retention+1)
	if err != nil {
		return err
	}
	if len(records) <= s.retention {
		return nil
	}

	for _, rec := range records[s.retention:] {
		path := filepath.Join(s.backupDir, rec.Filename)
		_ = os.Remove(path)
	}
	return nil
}
