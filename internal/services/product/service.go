package product

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"

	"shopmate/internal/adapters/storage/sqlite"
	domain "shopmate/internal/domain/product"
)

// Service encapsulates business rules for inventory product management.
type Service struct {
	repo *sqlite.ProductRepository
}

// NewService builds a product service instance.
func NewService(repo *sqlite.ProductRepository) *Service {
	return &Service{repo: repo}
}

// Create registers a new product after validation.
func (s *Service) Create(ctx context.Context, input domain.CreateInput) (*domain.Product, error) {
	if err := input.Validate(); err != nil {
		return nil, fmt.Errorf("validate product: %w", err)
	}

	product, err := s.repo.Create(ctx, input)
	if err != nil {
		if isUniqueConstraint(err) {
			return nil, ErrDuplicateSKU
		}
		return nil, fmt.Errorf("create product: %w", err)
	}
	return product, nil
}

// List returns products ordered for UI consumption.
func (s *Service) List(ctx context.Context) ([]domain.Product, error) {
	products, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}

// Update modifies an existing product record.
func (s *Service) Update(ctx context.Context, id int64, input domain.UpdateInput) (*domain.Product, error) {
	product, err := s.repo.Update(ctx, id, input)
	if err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}
	return product, nil
}

// Delete removes a product.
func (s *Service) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

// AdjustStock applies a manual adjustment and returns the updated product.
func (s *Service) AdjustStock(ctx context.Context, input domain.AdjustmentInput) (*domain.Product, error) {
	product, err := s.repo.AdjustStock(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("adjust stock: %w", err)
	}
	return product, nil
}

// ImportSummary captures the result of a bulk CSV import.
type ImportSummary struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Errors  []string `json:"errors"`
}

// ImportCSV ingests CSV data following the product contract and upserts rows.
func (s *Service) ImportCSV(ctx context.Context, data []byte) (ImportSummary, error) {
	summary := ImportSummary{}
	rows, err := domain.ParseImportCSV(bytes.NewReader(data))
	if err != nil {
		summary.Errors = append(summary.Errors, err.Error())
		return summary, err
	}

	for _, row := range rows {
		_, created, upsertErr := s.repo.Upsert(ctx, row.ToCreateInput())
		if upsertErr != nil {
			summary.Errors = append(summary.Errors, fmt.Sprintf("line %d (sku=%s): %v", row.OriginalLine, row.SKU, upsertErr))
			continue
		}
		if created {
			summary.Created++
		} else {
			summary.Updated++
		}
	}

	if len(summary.Errors) > 0 {
		return summary, fmt.Errorf("import completed with %d error(s)", len(summary.Errors))
	}
	return summary, nil
}

// ExportCSV renders the current inventory to CSV bytes following the contract.
func (s *Service) ExportCSV(ctx context.Context) ([]byte, error) {
	products, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	var buf bytes.Buffer
	if err := domain.WriteExportCSV(&buf, products); err != nil {
		return nil, fmt.Errorf("write csv: %w", err)
	}
	return buf.Bytes(), nil
}

// LowStockCount returns the number of products below their reorder levels.
func (s *Service) LowStockCount(ctx context.Context) (int, error) {
	count, err := s.repo.CountLowStock(ctx)
	if err != nil {
		return 0, fmt.Errorf("count low stock: %w", err)
	}
	return count, nil
}

// ErrDuplicateSKU identifies unique constraint failures.
var ErrDuplicateSKU = errors.New("duplicate SKU")

func isUniqueConstraint(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique constraint failed: products.sku")
}
