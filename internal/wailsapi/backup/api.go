package backup

import (
	"context"

	"shopmate/internal/domain/backup"
	backupservice "shopmate/internal/services/backup"
)

// API exposes backup operations to the UI.
type API struct {
	service *backupservice.Service
}

// New constructs the backup API bridge.
func New(service *backupservice.Service) *API {
	return &API{service: service}
}

// Create triggers a backup and returns metadata.
func (api *API) Create(ctx context.Context) (*backup.Record, error) {
	return api.service.Create(ctx)
}

// List returns recent backup records.
func (api *API) List(ctx context.Context, limit int) ([]backup.Record, error) {
	return api.service.Latest(ctx, limit)
}
