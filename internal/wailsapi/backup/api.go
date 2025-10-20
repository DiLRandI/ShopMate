package backup

import (
	"context"

	"shopmate/internal/domain/backup"
	backupservice "shopmate/internal/services/backup"
	"shopmate/internal/wailsapi/response"
)

// API exposes backup operations to the UI.
type API struct {
	service       *backupservice.Service
	contextSource func() context.Context
}

// New constructs the backup API bridge.
func New(service *backupservice.Service, provider func() context.Context) *API {
	source := provider
	if source == nil {
		source = context.Background
	}
	return &API{service: service, contextSource: source}
}

// Create triggers a backup and returns metadata.
func (api *API) Create() response.Envelope[backup.Record] {
	ctx := api.contextSource()
	record, err := api.service.Create(ctx)
	if err != nil {
		return response.Failure[backup.Record](err.Error())
	}
	return response.Success(*record)
}

// List returns recent backup records.
func (api *API) List(limit int) response.Envelope[[]backup.Record] {
	ctx := api.contextSource()
	records, err := api.service.Latest(ctx, limit)
	if err != nil {
		return response.Failure[[]backup.Record](err.Error())
	}
	return response.Success(records)
}

// Restore restores the database from a backup filename.
func (api *API) Restore(filename string) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.Restore(ctx, filename); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// SetRetention updates retention policy days.
func (api *API) SetRetention(days int) response.Envelope[struct{}] {
	if err := api.service.SetRetention(days); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}
