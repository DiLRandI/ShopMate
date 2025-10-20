package report

import (
	"context"
	"encoding/base64"
	"time"

	"shopmate/internal/domain/report"
	reportservice "shopmate/internal/services/report"
	"shopmate/internal/wailsapi/response"
)

// API bridges reporting use cases to the frontend.
type API struct {
	service       *reportservice.Service
	contextSource func() context.Context
}

// New constructs the reporting API.
func New(service *reportservice.Service, provider func() context.Context) *API {
	source := provider
	if source == nil {
		source = context.Background
	}
	return &API{service: service, contextSource: source}
}

// DailySummary returns metrics for the given date (RFC3339 date string).
func (api *API) DailySummary(dateISO string) response.Envelope[report.DailySummary] {
	ctx := api.contextSource()
	date, err := time.Parse(time.RFC3339, dateISO)
	if err != nil {
		return response.Failure[report.DailySummary](err.Error())
	}
	summary, err := api.service.DailySummary(ctx, date)
	if err != nil {
		return response.Failure[report.DailySummary](err.Error())
	}
	return response.Success(*summary)
}

// TopProducts returns top products within range.
func (api *API) TopProducts(fromISO, toISO string, limit int) response.Envelope[[]report.TopProduct] {
	ctx := api.contextSource()
	from, err := time.Parse(time.RFC3339, fromISO)
	if err != nil {
		return response.Failure[[]report.TopProduct](err.Error())
	}
	to, err := time.Parse(time.RFC3339, toISO)
	if err != nil {
		return response.Failure[[]report.TopProduct](err.Error())
	}
	products, err := api.service.TopProducts(ctx, from, to, limit)
	if err != nil {
		return response.Failure[[]report.TopProduct](err.Error())
	}
	return response.Success(products)
}

// DailySummaryCSV exports the summary as CSV (base64 encoded).
func (api *API) DailySummaryCSV(dateISO string) response.Envelope[string] {
	ctx := api.contextSource()
	date, err := time.Parse(time.RFC3339, dateISO)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	bytes, err := api.service.DailySummaryCSV(ctx, date)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	return response.Success(base64.StdEncoding.EncodeToString(bytes))
}

// TopProductsCSV exports top products as CSV (base64 encoded).
func (api *API) TopProductsCSV(fromISO, toISO string, limit int) response.Envelope[string] {
	ctx := api.contextSource()
	from, err := time.Parse(time.RFC3339, fromISO)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	to, err := time.Parse(time.RFC3339, toISO)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	bytes, err := api.service.TopProductsCSV(ctx, from, to, limit)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	return response.Success(base64.StdEncoding.EncodeToString(bytes))
}
