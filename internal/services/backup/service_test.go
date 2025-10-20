package backup_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"shopmate/internal/adapters/storage/sqlite"
	backupservice "shopmate/internal/services/backup"
)

func TestBackupRetentionAndRestore(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "data.sqlite")

	store, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })

	repo := sqlite.NewBackupRepository(store.DB())
	service := backupservice.NewService(repo, dbPath)
	if err := service.SetRetention(1); err != nil {
		t.Fatalf("set retention: %v", err)
	}

	first, err := service.Create(context.Background())
	if err != nil {
		t.Fatalf("create backup: %v", err)
	}

	firstPath := filepath.Join(dir, "backups", first.Filename)
	if _, err := os.Stat(firstPath); err != nil {
		t.Fatalf("first backup not created: %v", err)
	}

	second, err := service.Create(context.Background())
	if err != nil {
		t.Fatalf("create backup: %v", err)
	}

	backupDir := filepath.Join(dir, "backups")
	t.Logf("new backup filename: %s", second.Filename)
	if _, err := os.Stat(filepath.Join(backupDir, second.Filename)); err != nil {
		entries, _ := os.ReadDir(dir)
		backups, _ := os.ReadDir(backupDir)
		t.Logf("dir entries: %v", entries)
		t.Logf("backup contents: %v", backups)
		t.Fatalf("expected backup file to exist: %v", err)
	}

	backups, err := service.Latest(context.Background(), 10)
	if err != nil {
		t.Fatalf("latest: %v", err)
	}
	if len(backups) != 1 {
		t.Fatalf("expected 1 backup after retention, got %d", len(backups))
	}
	if backups[0].Filename != second.Filename {
		t.Fatalf("expected newest backup to remain")
	}

	// Read current database bytes for comparison
	original, err := os.ReadFile(dbPath)
	if err != nil {
		t.Fatalf("read db: %v", err)
	}

	// Overwrite database with custom bytes
	if err := os.WriteFile(dbPath, []byte("corrupted"), 0o644); err != nil {
		t.Fatalf("write db: %v", err)
	}

	if err := store.Close(); err != nil {
		t.Fatalf("close store: %v", err)
	}

	reopened, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer reopened.Close()

	repo = sqlite.NewBackupRepository(reopened.DB())
	service = backupservice.NewService(repo, dbPath)
	if err := service.SetRetention(1); err != nil {
		t.Fatalf("set retention: %v", err)
	}

	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatalf("read backup dir: %v", err)
	}
	if len(entries) == 0 {
		t.Fatalf("expected backup file to exist")
	}

	if err := service.Restore(context.Background(), second.Filename); err != nil {
		t.Fatalf("restore: %v", err)
	}

	restored, err := os.ReadFile(dbPath)
	if err != nil {
		t.Fatalf("read restored db: %v", err)
	}

	if len(restored) != len(original) {
		t.Fatalf("expected restored db size %d got %d", len(original), len(restored))
	}
}
