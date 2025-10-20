package sale

import (
	"context"
	"time"

	domainsale "shopmate/internal/domain/sale"
	saleservice "shopmate/internal/services/sale"
	"shopmate/internal/wailsapi/response"
)

// API bridges sale services to the frontend.
type API struct {
	service       *saleservice.Service
	contextSource func() context.Context
}

// New constructs the sale API.
func New(service *saleservice.Service, provider func() context.Context) *API {
	source := provider
	if source == nil {
		source = context.Background
	}
	return &API{service: service, contextSource: source}
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
	Note          string                  `json:"note"`
	Lines         []CreateSaleRequestLine `json:"lines"`
}

// ListSalesRequest describes filters for history retrieval.
type ListSalesRequest struct {
	FromISO        string   `json:"from"`
	ToISO          string   `json:"to"`
	PaymentMethods []string `json:"paymentMethods"`
	Statuses       []string `json:"statuses"`
	CustomerQuery  string   `json:"customerQuery"`
	Limit          int      `json:"limit"`
	Offset         int      `json:"offset"`
}

// CreateSale records a sale and returns the saved invoice.
func (api *API) CreateSale(req CreateSaleRequest) response.Envelope[domainsale.Sale] {
	ctx := api.contextSource()
	lines := make([]saleservice.CreateRequestLine, 0, len(req.Lines))
	for _, line := range req.Lines {
		lines = append(lines, saleservice.CreateRequestLine{
			ProductID:     line.ProductID,
			Quantity:      line.Quantity,
			DiscountCents: line.DiscountCents,
		})
	}

	sale, err := api.service.Create(ctx, saleservice.CreateRequest{
		SaleNumber:    req.SaleNumber,
		CustomerName:  req.CustomerName,
		PaymentMethod: req.PaymentMethod,
		DiscountCents: req.DiscountCents,
		Note:          req.Note,
		Lines:         lines,
	})
	if err != nil {
		return response.Failure[domainsale.Sale](err.Error())
	}
	return response.Success(*sale)
}

// ListSales returns sales based on the provided filters.
func (api *API) ListSales(req ListSalesRequest) response.Envelope[[]domainsale.Sale] {
	ctx := api.contextSource()
	var filter domainsale.Filter
	if req.FromISO != "" {
		if parsed, err := time.Parse(time.RFC3339, req.FromISO); err == nil {
			filter.From = parsed
		}
	}
	if req.ToISO != "" {
		if parsed, err := time.Parse(time.RFC3339, req.ToISO); err == nil {
			filter.To = parsed
		}
	}
	filter.PaymentMethods = req.PaymentMethods
	filter.Status = req.Statuses
	filter.CustomerQuery = req.CustomerQuery
	filter.Limit = req.Limit
	filter.Offset = req.Offset

	sales, err := api.service.List(ctx, filter)
	if err != nil {
		return response.Failure[[]domainsale.Sale](err.Error())
	}
	return response.Success(sales)
}

// GetSale returns a sale by id.
func (api *API) GetSale(id int64) response.Envelope[domainsale.Sale] {
	ctx := api.contextSource()
	sale, err := api.service.Get(ctx, id)
	if err != nil {
		return response.Failure[domainsale.Sale](err.Error())
	}
	return response.Success(*sale)
}

// RefundSale reverts a sale and restores inventory.

func (api *API) RefundSale(saleID int64) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.Refund(ctx, saleID); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// VoidSale voids a sale and restores inventory.
func (api *API) VoidSale(saleID int64, note string) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.Void(ctx, saleID, note); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}
