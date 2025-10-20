package product

import (
	"context"
	"errors"
	"math"

	domain "shopmate/internal/domain/product"
	service "shopmate/internal/services/product"
)

// API exposes product operations to the Wails frontend layer.
type API struct {
	service       *service.Service
	contextSource func() context.Context
}

// New constructs the product API bridge.
func New(service *service.Service, provider func() context.Context) *API {
	source := provider
	if source == nil {
		source = context.Background
	}
	return &API{service: service, contextSource: source}
}

// ProductInput describes the fields accepted from the frontend.
type ProductInput struct {
	Name           string  `json:"name"`
	SKU            string  `json:"sku"`
	Category       string  `json:"category"`
	UnitPriceCents int64   `json:"unitPriceCents"`
	TaxRate        float64 `json:"taxRate"`
	StockQuantity  int64   `json:"stockQuantity"`
	ReorderLevel   int64   `json:"reorderLevel"`
	Notes          string  `json:"notes"`
}

// ProductView models the product payload returned to the frontend.
type ProductView struct {
	ID                 int64   `json:"id"`
	Name               string  `json:"name"`
	SKU                string  `json:"sku"`
	Category           string  `json:"category"`
	UnitPriceCents     int64   `json:"unitPriceCents"`
	TaxRate            float64 `json:"taxRate"`
	TaxRateBasisPoints int64   `json:"taxRateBasisPoints"`
	StockQuantity      int64   `json:"stockQuantity"`
	CurrentQty         int64   `json:"currentQty"`
	ReorderLevel       int64   `json:"reorderLevel"`
	Notes              string  `json:"notes"`
}

// CreateProduct persists a product and returns its representation.
func (api *API) CreateProduct(input ProductInput) (*ProductView, error) {
	ctx := api.contextSource()
	taxBasisPoints := amountToBasisPoints(input.TaxRate)
	product, err := api.service.Create(ctx, domain.CreateInput{
		Name:               input.Name,
		SKU:                input.SKU,
		Category:           input.Category,
		UnitPriceCents:     input.UnitPriceCents,
		TaxRateBasisPoints: taxBasisPoints,
		CurrentQty:         input.StockQuantity,
		ReorderLevel:       input.ReorderLevel,
		Notes:              input.Notes,
	})
	if err != nil {
		if errors.Is(err, service.ErrDuplicateSKU) {
			return nil, ErrDuplicateSKU
		}
		return nil, err
	}
	return mapProduct(product), nil
}

// ListProducts retrieves all products.
func (api *API) ListProducts() ([]ProductView, error) {
	ctx := api.contextSource()
	products, err := api.service.List(ctx)
	if err != nil {
		return nil, err
	}

	views := make([]ProductView, 0, len(products))
	for _, p := range products {
		p := p
		views = append(views, *mapProduct(&p))
	}
	return views, nil
}

// ErrDuplicateSKU surfaces duplicate sku validation errors to the frontend.
var ErrDuplicateSKU = errors.New("DUPLICATE_SKU")

func mapProduct(p *domain.Product) *ProductView {
	return &ProductView{
		ID:                 p.ID,
		Name:               p.Name,
		SKU:                p.SKU,
		Category:           p.Category,
		UnitPriceCents:     p.UnitPriceCents,
		TaxRate:            basisPointsToPercent(p.TaxRateBasisPoints),
		TaxRateBasisPoints: p.TaxRateBasisPoints,
		StockQuantity:      p.CurrentQty,
		CurrentQty:         p.CurrentQty,
		ReorderLevel:       p.ReorderLevel,
		Notes:              p.Notes,
	}
}

func amountToBasisPoints(percent float64) int64 {
	return int64(math.Round(percent * 100.0))
}

func basisPointsToPercent(bp int64) float64 {
	return float64(bp) / 100.0
}
