package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"time"

	_ "modernc.org/sqlite"

	"shopmate/migrations"
)

const defaultBusyTimeout = 5 * time.Second

// Store wraps a SQLite connection with migration helpers.
type Store struct {
	db   *sql.DB
	path string
}

// Open initialises the SQLite database using the provided file path and applies embedded migrations.
func Open(ctx context.Context, path string) (*Store, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)&cache=shared", path)

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	if err := configureConnection(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}

	if err := applyMigrations(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}

	return &Store{db: db, path: path}, nil
}

// DB exposes the raw database handle.
func (s *Store) DB() *sql.DB {
	return s.db
}

// Path returns the on-disk database path.
func (s *Store) Path() string {
	return s.path
}

// Close releases the database connection pool.
func (s *Store) Close() error {
	if s.db == nil {
		return nil
	}
	return s.db.Close()
}

func configureConnection(ctx context.Context, db *sql.DB) error {
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		fmt.Sprintf("PRAGMA busy_timeout=%d;", int(defaultBusyTimeout.Milliseconds())),
		"PRAGMA foreign_keys=ON;",
		"PRAGMA synchronous=NORMAL;",
	}

	for _, pragma := range pragmas {
		if _, err := db.ExecContext(ctx, pragma); err != nil {
			return fmt.Errorf("configure pragma %q: %w", pragma, err)
		}
	}

	return nil
}

func applyMigrations(ctx context.Context, db *sql.DB) error {
	entries, err := migrations.Files.ReadDir(".")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	if len(entries) == 0 {
		return errors.New("no migrations found")
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	for _, name := range names {
		content, readErr := migrations.Files.ReadFile(name)
		if readErr != nil {
			err = fmt.Errorf("read migration %s: %w", name, readErr)
			return err
		}

		if _, execErr := tx.ExecContext(ctx, string(content)); execErr != nil {
			err = fmt.Errorf("run migration %s: %w", name, execErr)
			return err
		}
	}

	if commitErr := tx.Commit(); commitErr != nil {
		return fmt.Errorf("commit migrations: %w", commitErr)
	}

	return nil
}
