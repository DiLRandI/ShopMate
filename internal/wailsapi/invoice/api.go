package invoice

import (
	"context"
	"encoding/base64"

	invoiceservice "shopmate/internal/services/invoice"
	"shopmate/internal/wailsapi/response"
)

// API exposes invoice rendering helpers.
type API struct {
	service       *invoiceservice.Service
	contextSource func() context.Context
}

// New constructs the invoice API bridge.
func New(service *invoiceservice.Service) *API {
	return &API{service: service, contextSource: context.Background}
}

// WithContextSource overrides the context provider.
func (api *API) WithContextSource(provider func() context.Context) {
	if provider != nil {
		api.contextSource = provider
	}
}

// GenerateHTML returns the invoice HTML for a sale id.
func (api *API) GenerateHTML(saleID int64) response.Envelope[string] {
	ctx := api.contextSource()
	html, err := api.service.GenerateHTML(ctx, saleID)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	return response.Success(html)
}

// GeneratePDF returns a base64 encoded PDF for the sale id.
func (api *API) GeneratePDF(saleID int64) response.Envelope[string] {
	ctx := api.contextSource()
	bytes, err := api.service.GeneratePDF(ctx, saleID)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	return response.Success(base64.StdEncoding.EncodeToString(bytes))
}
