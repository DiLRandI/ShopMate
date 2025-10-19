package product

import (
	"context"
	"errors"

	domain "shopmate/internal/domain/product"
	service "shopmate/internal/services/product"
)

// API exposes product operations to the Wails frontend layer.
type API struct {
	service *service.Service
}

// New constructs the product API bridge.
func New(service *service.Service) *API {
	return &API{service: service}
}

// ProductInput describes the fields accepted from the frontend.
type ProductInput struct {
	Name           string  `json:"name"`
	SKU            string  `json:"sku"`
	UnitPriceCents int64   `json:"unitPriceCents"`
	TaxRate        float64 `json:"taxRate"`
	StockQuantity  int64   `json:"stockQuantity"`
	ReorderLevel   int64   `json:"reorderLevel"`
	Notes          string  `json:"notes"`
}

// ProductView models the product payload returned to the frontend.
type ProductView struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	SKU            string  `json:"sku"`
	UnitPriceCents int64   `json:"unitPriceCents"`
	TaxRate        float64 `json:"taxRate"`
	StockQuantity  int64   `json:"stockQuantity"`
	ReorderLevel   int64   `json:"reorderLevel"`
	Notes          string  `json:"notes"`
}

// CreateProduct persists a product and returns its representation.
func (api *API) CreateProduct(ctx context.Context, input ProductInput) (*ProductView, error) {
	product, err := api.service.Create(ctx, domain.CreateInput{
		Name:           input.Name,
		SKU:            input.SKU,
		UnitPriceCents: input.UnitPriceCents,
		TaxRate:        input.TaxRate,
		StockQuantity:  input.StockQuantity,
		ReorderLevel:   input.ReorderLevel,
		Notes:          input.Notes,
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
func (api *API) ListProducts(ctx context.Context) ([]ProductView, error) {
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
		ID:             p.ID,
		Name:           p.Name,
		SKU:            p.SKU,
		UnitPriceCents: p.UnitPriceCents,
		TaxRate:        p.TaxRate,
		StockQuantity:  p.StockQuantity,
		ReorderLevel:   p.ReorderLevel,
		Notes:          p.Notes,
	}
}
