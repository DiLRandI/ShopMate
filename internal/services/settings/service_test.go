package settings_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"shopmate/internal/adapters/storage/sqlite"
	domainsettings "shopmate/internal/domain/settings"
	settingssvc "shopmate/internal/services/settings"
)

func TestOwnerPINLifecycle(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "app.sqlite")
	store, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = store.Close(); _ = os.Remove(dbPath) })

	repo := sqlite.NewSettingsRepository(store.DB())
	service := settingssvc.NewService(repo)

	if err := service.SetOwnerPIN(context.Background(), "1234"); err != nil {
		t.Fatalf("set pin: %v", err)
	}

	if err := service.VerifyOwnerPIN(context.Background(), "1234"); err != nil {
		t.Fatalf("verify pin: %v", err)
	}

	if err := service.VerifyOwnerPIN(context.Background(), "9999"); err == nil {
		t.Fatalf("expected mismatch error")
	}

	if err := service.ClearOwnerPIN(context.Background()); err != nil {
		t.Fatalf("clear pin: %v", err)
	}
}

func TestPreferencesRoundTrip(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "prefs.sqlite")
	store, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = store.Close(); _ = os.Remove(dbPath) })

	repo := sqlite.NewSettingsRepository(store.DB())
	service := settingssvc.NewService(repo)

	prefs := domainsettings.Preferences{Locale: "en-US", DarkMode: true, EnableTelemetry: true}
	saved, err := service.SavePreferences(context.Background(), prefs)
	if err != nil {
		t.Fatalf("save preferences: %v", err)
	}
	if !saved.DarkMode {
		t.Fatalf("expected dark mode true")
	}

	loaded, err := service.Preferences(context.Background())
	if err != nil {
		t.Fatalf("load preferences: %v", err)
	}
	if loaded.Locale != "en-US" {
		t.Fatalf("unexpected locale %s", loaded.Locale)
	}
	if !loaded.DarkMode {
		t.Fatalf("expected dark mode persisted")
	}
}
