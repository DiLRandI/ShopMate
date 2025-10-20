package settings

import (
	"context"

	domain "shopmate/internal/domain/settings"
	settingsservice "shopmate/internal/services/settings"
	"shopmate/internal/wailsapi/response"
)

// API exposes settings operations to the frontend.
type API struct {
	service       *settingsservice.Service
	contextSource func() context.Context
}

// New constructs the settings API bridge.
func New(service *settingsservice.Service) *API {
	return &API{
		service:       service,
		contextSource: context.Background,
	}
}

// WithContextSource overrides the provider used to populate contexts.
func (api *API) WithContextSource(provider func() context.Context) {
	if provider != nil {
		api.contextSource = provider
	}
}

// Profile returns the stored profile.
func (api *API) Profile() response.Envelope[domain.Profile] {
	ctx := api.contextSource()
	profile, err := api.service.Profile(ctx)
	if err != nil {
		return response.Failure[domain.Profile](err.Error())
	}
	return response.Success(profile)
}

// SaveProfile persists updates to the profile.
func (api *API) SaveProfile(profile domain.Profile) response.Envelope[domain.Profile] {
	ctx := api.contextSource()
	saved, err := api.service.SaveProfile(ctx, profile)
	if err != nil {
		return response.Failure[domain.Profile](err.Error())
	}
	return response.Success(saved)
}

// Preferences returns UI preferences.
func (api *API) Preferences() response.Envelope[domain.Preferences] {
	ctx := api.contextSource()
	prefs, err := api.service.Preferences(ctx)
	if err != nil {
		return response.Failure[domain.Preferences](err.Error())
	}
	return response.Success(prefs)
}

// SavePreferences updates stored preferences.
func (api *API) SavePreferences(prefs domain.Preferences) response.Envelope[domain.Preferences] {
	ctx := api.contextSource()
	saved, err := api.service.SavePreferences(ctx, prefs)
	if err != nil {
		return response.Failure[domain.Preferences](err.Error())
	}
	return response.Success(saved)
}

// SetOwnerPIN stores the owner pin.
func (api *API) SetOwnerPIN(pin string) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.SetOwnerPIN(ctx, pin); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// VerifyOwnerPIN verifies the provided pin.
func (api *API) VerifyOwnerPIN(pin string) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.VerifyOwnerPIN(ctx, pin); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// ClearOwnerPIN removes the stored pin.
func (api *API) ClearOwnerPIN() response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.ClearOwnerPIN(ctx); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// HasOwnerPIN reports if a pin exists.
func (api *API) HasOwnerPIN() response.Envelope[bool] {
	ctx := api.contextSource()
	flag, err := api.service.HasOwnerPIN(ctx)
	if err != nil {
		return response.Failure[bool](err.Error())
	}
	return response.Success(flag)
}
