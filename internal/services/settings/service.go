package settings

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"golang.org/x/crypto/bcrypt"

	"shopmate/internal/adapters/storage/sqlite"
	domain "shopmate/internal/domain/settings"
)

var (
	// ErrPINNotSet indicates no owner PIN exists.
	ErrPINNotSet = errors.New("owner pin not set")
	// ErrPINInvalidFormat indicates provided pin failed validation.
	ErrPINInvalidFormat = errors.New("pin must be 4-10 digits")
	// ErrPINMismatch indicates verification failed.
	ErrPINMismatch = errors.New("pin does not match")

	pinPattern = regexp.MustCompile(`^\d{4,10}$`)
)

// Service exposes settings use cases.
type Service struct {
	repo *sqlite.SettingsRepository
}

// NewService constructs a settings service.
func NewService(repo *sqlite.SettingsRepository) *Service {
	return &Service{repo: repo}
}

// Profile returns the stored profile or defaults.
func (s *Service) Profile(ctx context.Context) (domain.Profile, error) {
	return s.repo.LoadProfile(ctx)
}

// SaveProfile persists profile updates after validation.
func (s *Service) SaveProfile(ctx context.Context, profile domain.Profile) (domain.Profile, error) {
	if err := s.repo.SaveProfile(ctx, profile); err != nil {
		return domain.Profile{}, err
	}
	return s.repo.LoadProfile(ctx)
}

// Preferences returns UI preferences.
func (s *Service) Preferences(ctx context.Context) (domain.Preferences, error) {
	return s.repo.LoadPreferences(ctx)
}

// SavePreferences stores updated UI preferences.
func (s *Service) SavePreferences(ctx context.Context, prefs domain.Preferences) (domain.Preferences, error) {
	if err := s.repo.SavePreferences(ctx, prefs); err != nil {
		return domain.Preferences{}, err
	}
	return s.repo.LoadPreferences(ctx)
}

// SetOwnerPIN validates and stores the owner pin.
func (s *Service) SetOwnerPIN(ctx context.Context, pin string) error {
	if !pinPattern.MatchString(pin) {
		return ErrPINInvalidFormat
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash pin: %w", err)
	}
	return s.repo.SaveOwnerPIN(ctx, string(hash))
}

// VerifyOwnerPIN checks the submitted pin against stored hash.
func (s *Service) VerifyOwnerPIN(ctx context.Context, pin string) error {
	hash, err := s.repo.LoadOwnerPIN(ctx)
	if err != nil {
		return err
	}
	if hash == "" {
		return ErrPINNotSet
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin)); err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return ErrPINMismatch
		}
		return fmt.Errorf("compare pin: %w", err)
	}
	return nil
}

// ClearOwnerPIN removes the owner pin.
func (s *Service) ClearOwnerPIN(ctx context.Context) error {
	return s.repo.ClearOwnerPIN(ctx)
}

// HasOwnerPIN reports whether an owner pin exists.
func (s *Service) HasOwnerPIN(ctx context.Context) (bool, error) {
	hash, err := s.repo.LoadOwnerPIN(ctx)
	if err != nil {
		return false, err
	}
	return hash != "", nil
}
