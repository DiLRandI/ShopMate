package product

import (
	"context"
	"encoding/base64"
	"errors"
	"math"

	domain "shopmate/internal/domain/product"
	service "shopmate/internal/services/product"
	"shopmate/internal/wailsapi/response"
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

type UpdateProductRequest struct {
	ID   int64        `json:"id"`
	Form ProductInput `json:"form"`
}

type AdjustStockRequest struct {
	ProductID int64  `json:"productId"`
	Delta     int64  `json:"delta"`
	Reason    string `json:"reason"`
	Ref       string `json:"ref"`
}

type ImportRequest struct {
	CSV string `json:"csv"`
}

// ImportResponse mirrors the service response for CSV imports.
type ImportResponse struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Errors  []string `json:"errors"`
}

// CreateProduct persists a product and returns its representation.
func (api *API) CreateProduct(input ProductInput) response.Envelope[ProductView] {
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
			return response.Failure[ProductView]("DUPLICATE_SKU")
		}
		return response.Failure[ProductView](err.Error())
	}
	return response.Success(*mapProduct(product))
}

// ListProducts retrieves all products.
func (api *API) ListProducts() response.Envelope[[]ProductView] {
	ctx := api.contextSource()
	products, err := api.service.List(ctx)
	if err != nil {
		return response.Failure[[]ProductView](err.Error())
	}

	views := make([]ProductView, 0, len(products))
	for _, p := range products {
		p := p
		views = append(views, *mapProduct(&p))
	}
	return response.Success(views)
}

// UpdateProduct updates a product by id.
func (api *API) UpdateProduct(req UpdateProductRequest) response.Envelope[ProductView] {
	ctx := api.contextSource()
	input := req.Form
	product, err := api.service.Update(ctx, req.ID, domain.UpdateInput{
		Name:               input.Name,
		Category:           input.Category,
		UnitPriceCents:     input.UnitPriceCents,
		TaxRateBasisPoints: amountToBasisPoints(input.TaxRate),
		ReorderLevel:       input.ReorderLevel,
		Notes:              input.Notes,
	})
	if err != nil {
		return response.Failure[ProductView](err.Error())
	}
	return response.Success(*mapProduct(product))
}

// DeleteProduct removes a product.
func (api *API) DeleteProduct(id int64) response.Envelope[struct{}] {
	ctx := api.contextSource()
	if err := api.service.Delete(ctx, id); err != nil {
		return response.Failure[struct{}](err.Error())
	}
	return response.SuccessNoData[struct{}]()
}

// AdjustStock performs a manual stock adjustment.
func (api *API) AdjustStock(req AdjustStockRequest) response.Envelope[ProductView] {
	ctx := api.contextSource()
	product, err := api.service.AdjustStock(ctx, domain.AdjustmentInput{
		ProductID: req.ProductID,
		Delta:     req.Delta,
		Reason:    req.Reason,
		Ref:       req.Ref,
	})
	if err != nil {
		return response.Failure[ProductView](err.Error())
	}
	return response.Success(*mapProduct(product))
}

// ImportProductsCSV imports CSV payload and returns summary counts.
func (api *API) ImportProductsCSV(req ImportRequest) response.Envelope[ImportResponse] {
	ctx := api.contextSource()
	summary, err := api.service.ImportCSV(ctx, []byte(req.CSV))
	result := ImportResponse(summary)
	if err != nil {
		return response.Failure[ImportResponse](err.Error())
	}
	return response.Success(result)
}

// ExportProductsCSV exports inventory to CSV (base64 encoded).
func (api *API) ExportProductsCSV() response.Envelope[string] {
	ctx := api.contextSource()
	data, err := api.service.ExportCSV(ctx)
	if err != nil {
		return response.Failure[string](err.Error())
	}
	encoded := base64.StdEncoding.EncodeToString(data)
	return response.Success(encoded)
}

// LowStockCount reports the number of low-stock items.
func (api *API) LowStockCount() response.Envelope[int] {
	ctx := api.contextSource()
	count, err := api.service.LowStockCount(ctx)
	if err != nil {
		return response.Failure[int](err.Error())
	}
	return response.Success(count)
}

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
