package backup

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	"shopmate/internal/domain/backup"
)

const defaultRetention = 30

// Service manages database backup lifecycle.
type Service struct {
	repo      *sqlite.BackupRepository
	dbPath    string
	backupDir string
	retention int
	mu        sync.Mutex

	schedulerCancel context.CancelFunc
}

// NewService constructs a backup service rooted at the database path.
func NewService(repo *sqlite.BackupRepository, dbPath string) *Service {
	dir := filepath.Join(filepath.Dir(dbPath), "backups")
	service := &Service{
		repo:      repo,
		dbPath:    dbPath,
		backupDir: dir,
		retention: defaultRetention,
	}

	if repo != nil {
		if days, err := repo.RetentionDays(context.Background()); err == nil && days > 0 {
			service.retention = days
		}
	}

	return service
}

// SetRetention configures how many backup files to keep on disk.
func (s *Service) SetRetention(count int) error {
	if count <= 0 {
		return fmt.Errorf("retention must be greater than zero (got %d)", count)
	}

	if s.repo != nil {
		if err := s.repo.UpdateRetentionDays(context.Background(), count); err != nil {
			return err
		}
	}

	s.retention = count
	return nil
}

// Create snapshot copies the SQLite db into backupDir and records metadata.
func (s *Service) Create(ctx context.Context) (*backup.Record, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(s.backupDir, 0o755); err != nil {
		return nil, fmt.Errorf("create backup dir: %w", err)
	}

	src, err := os.Open(s.dbPath)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	defer src.Close()

	now := time.Now()
	filename := fmt.Sprintf("backup_%s_%09d.sqlite", now.Format("20060102_150405"), now.Nanosecond())
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

// Restore replaces the active database with a selected backup.
func (s *Service) Restore(ctx context.Context, filename string) error {
	if strings.TrimSpace(filename) == "" {
		return errors.New("backup filename is required")
	}

	source := filepath.Join(s.backupDir, filename)
	if _, err := os.Stat(source); err != nil {
		return fmt.Errorf("backup not found: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	preRestoreName := fmt.Sprintf("app-pre-restore_%s.sqlite", time.Now().Format("20060102_150405"))
	preRestorePath := filepath.Join(s.backupDir, preRestoreName)

	if err := copyFile(s.dbPath, preRestorePath); err != nil {
		return fmt.Errorf("snapshot current db: %w", err)
	}

	tempPath := s.dbPath + ".restore"
	if err := copyFile(source, tempPath); err != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("copy restore target: %w", err)
	}

	if err := os.Rename(tempPath, s.dbPath); err != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("replace db: %w", err)
	}

	if _, err := s.repo.Record(ctx, preRestoreName, fileSize(preRestorePath)); err != nil {
		return fmt.Errorf("record pre-restore backup: %w", err)
	}

	return nil
}

// StartScheduler launches a background goroutine that creates backups nightly.
func (s *Service) StartScheduler(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.schedulerCancel != nil {
		return
	}

	runCtx, cancel := context.WithCancel(ctx)
	s.schedulerCancel = cancel

	go s.schedulerLoop(runCtx)
}

// StopScheduler stops the background scheduler if running.
func (s *Service) StopScheduler() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.schedulerCancel != nil {
		s.schedulerCancel()
		s.schedulerCancel = nil
	}
}

func (s *Service) applyRetention() error {
	count, err := s.repo.Count(context.Background())
	if err != nil {
		return err
	}
	if count <= s.retention {
		return nil
	}

	obsolete, err := s.repo.Oldest(context.Background(), count-s.retention)
	if err != nil {
		return err
	}

	for _, rec := range obsolete {
		path := filepath.Join(s.backupDir, rec.Filename)
		_ = os.Remove(path)
		_ = s.repo.Delete(context.Background(), rec.ID)
	}
	return nil
}

func (s *Service) schedulerLoop(ctx context.Context) {
	for {
		next := nextMidnight()
		timer := time.NewTimer(time.Until(next))

		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			_, _ = s.Create(context.Background())
		}
	}
}

func nextMidnight() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
	}()

	if _, err = io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func fileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}
