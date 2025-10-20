package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"shopmate/internal/domain/settings"
)

const (
	settingsKeyProfile     = "profile"
	settingsKeyOwnerPIN    = "owner_pin"
	settingsKeyPreferences = "preferences"
)

// SettingsRepository persists key-value application settings.
type SettingsRepository struct {
	db *sql.DB
}

// NewSettingsRepository constructs a repository.
func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// SaveProfile stores the profile document.
func (r *SettingsRepository) SaveProfile(ctx context.Context, profile settings.Profile) error {
	if err := profile.Validate(); err != nil {
		return err
	}
	profile.ApplyDefaults()
	return r.saveJSON(ctx, settingsKeyProfile, profile)
}

// LoadProfile retrieves the profile if present.
func (r *SettingsRepository) LoadProfile(ctx context.Context) (settings.Profile, error) {
	var profile settings.Profile
	if err := r.loadJSON(ctx, settingsKeyProfile, &profile); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			profile.ApplyDefaults()
			return profile, nil
		}
		return settings.Profile{}, err
	}
	profile.ApplyDefaults()
	return profile, nil
}

// SavePreferences stores UI preferences.
func (r *SettingsRepository) SavePreferences(ctx context.Context, prefs settings.Preferences) error {
	prefs.ApplyDefaults()
	return r.saveJSON(ctx, settingsKeyPreferences, prefs)
}

// LoadPreferences fetches saved preferences or defaults.
func (r *SettingsRepository) LoadPreferences(ctx context.Context) (settings.Preferences, error) {
	var prefs settings.Preferences
	if err := r.loadJSON(ctx, settingsKeyPreferences, &prefs); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			prefs.ApplyDefaults()
			return prefs, nil
		}
		return settings.Preferences{}, err
	}
	prefs.ApplyDefaults()
	return prefs, nil
}

// SaveOwnerPIN stores the hashed owner PIN payload.
func (r *SettingsRepository) SaveOwnerPIN(ctx context.Context, hash string) error {
	payload := map[string]interface{}{
		"hash":      hash,
		"updatedAt": time.Now().UnixMilli(),
	}
	return r.saveJSON(ctx, settingsKeyOwnerPIN, payload)
}

// LoadOwnerPIN retrieves the hashed owner pin if present.
func (r *SettingsRepository) LoadOwnerPIN(ctx context.Context) (string, error) {
	var payload struct {
		Hash string `json:"hash"`
	}
	if err := r.loadJSON(ctx, settingsKeyOwnerPIN, &payload); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return payload.Hash, nil
}

// ClearOwnerPIN removes the stored owner pin.
func (r *SettingsRepository) ClearOwnerPIN(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM settings WHERE key = ?`, settingsKeyOwnerPIN)
	if err != nil {
		return fmt.Errorf("clear owner pin: %w", err)
	}
	return nil
}

func (r *SettingsRepository) saveJSON(ctx context.Context, key string, value interface{}) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal %s: %w", key, err)
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO settings (key, value)
		VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key,
		string(payload),
	)
	if err != nil {
		return fmt.Errorf("persist %s: %w", key, err)
	}
	return nil
}

func (r *SettingsRepository) loadJSON(ctx context.Context, key string, target interface{}) error {
	var value string
	if err := r.db.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, key).Scan(&value); err != nil {
		return err
	}
	if err := json.Unmarshal([]byte(value), target); err != nil {
		return fmt.Errorf("unmarshal %s: %w", key, err)
	}
	return nil
}
