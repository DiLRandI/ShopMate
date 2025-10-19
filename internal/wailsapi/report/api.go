package report

import (
	"context"
	"time"

	"shopmate/internal/domain/report"
	reportservice "shopmate/internal/services/report"
)

// API bridges reporting use cases to the frontend.
type API struct {
	service *reportservice.Service
}

// New constructs the reporting API.
func New(service *reportservice.Service) *API {
	return &API{service: service}
}

// DailySummary returns metrics for the given date (RFC3339 date string).
func (api *API) DailySummary(ctx context.Context, dateISO string) (*report.DailySummary, error) {
	date, err := time.Parse(time.RFC3339, dateISO)
	if err != nil {
		return nil, err
	}
	return api.service.DailySummary(ctx, date)
}

// TopProducts returns top products within range.
func (api *API) TopProducts(ctx context.Context, fromISO, toISO string, limit int) ([]report.TopProduct, error) {
	from, err := time.Parse(time.RFC3339, fromISO)
	if err != nil {
		return nil, err
	}
	to, err := time.Parse(time.RFC3339, toISO)
	if err != nil {
		return nil, err
	}
	return api.service.TopProducts(ctx, from, to, limit)
}
