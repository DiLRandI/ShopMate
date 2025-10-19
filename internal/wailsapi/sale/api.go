package sale

import (
	"context"
	"time"

	domainsale "shopmate/internal/domain/sale"
	saleservice "shopmate/internal/services/sale"
)

// API bridges sale services to the frontend.
type API struct {
	service *saleservice.Service
}

// New constructs the sale API.
func New(service *saleservice.Service) *API {
	return &API{service: service}
}

// CreateSaleRequestLine represents a line input from frontend.
type CreateSaleRequestLine struct {
	ProductID     int64 `json:"productId"`
	Quantity      int64 `json:"quantity"`
	DiscountCents int64 `json:"discountCents"`
}

// CreateSaleRequest payload.
type CreateSaleRequest struct {
	SaleNumber    string                  `json:"saleNumber"`
	CustomerName  string                  `json:"customerName"`
	PaymentMethod string                  `json:"paymentMethod"`
	DiscountCents int64                   `json:"discountCents"`
	Lines         []CreateSaleRequestLine `json:"lines"`
}

// CreateSale records a sale and returns the saved invoice.
func (api *API) CreateSale(ctx context.Context, req CreateSaleRequest) (*domainsale.Sale, error) {
	lines := make([]saleservice.CreateRequestLine, 0, len(req.Lines))
	for _, line := range req.Lines {
		lines = append(lines, saleservice.CreateRequestLine{
			ProductID:     line.ProductID,
			Quantity:      line.Quantity,
			DiscountCents: line.DiscountCents,
		})
	}

	return api.service.Create(ctx, saleservice.CreateRequest{
		SaleNumber:    req.SaleNumber,
		CustomerName:  req.CustomerName,
		PaymentMethod: req.PaymentMethod,
		DiscountCents: req.DiscountCents,
		Lines:         lines,
	})
}

// ListSales returns sales between ISO-8601 date strings (inclusive range).
func (api *API) ListSales(ctx context.Context, fromISO, toISO string) ([]domainsale.Sale, error) {
	from, err := time.Parse(time.RFC3339, fromISO)
	if err != nil {
		return nil, err
	}
	to, err := time.Parse(time.RFC3339, toISO)
	if err != nil {
		return nil, err
	}
	return api.service.List(ctx, from, to)
}

// RefundSale reverts a sale and restores inventory.
func (api *API) RefundSale(ctx context.Context, saleID int64) error {
	return api.service.Refund(ctx, saleID)
}
