package product

import (
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

// ErrDuplicateSKU identifies unique constraint failures.
var ErrDuplicateSKU = errors.New("duplicate SKU")

func isUniqueConstraint(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique constraint failed: products.sku")
}
