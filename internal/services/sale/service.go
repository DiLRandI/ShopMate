package sale

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	domainsale "shopmate/internal/domain/sale"
)

// Repository abstraction enables testing.
type repository interface {
	Create(ctx context.Context, draft domainsale.Sale) (*domainsale.Sale, error)
	List(ctx context.Context, from, to time.Time) ([]domainsale.Sale, error)
	Refund(ctx context.Context, saleID int64) error
}

// Service orchestrates sale workflows.
type Service struct {
	products *sqlite.ProductRepository
	repo     repository
}

// NewService builds a sale service.
func NewService(products *sqlite.ProductRepository, repo repository) *Service {
	return &Service{products: products, repo: repo}
}

// CreateRequestLine describes input from POS.
type CreateRequestLine struct {
	ProductID     int64
	Quantity      int64
	DiscountCents int64
}

// CreateRequest is the payload for creating a sale.
type CreateRequest struct {
	SaleNumber    string
	CustomerName  string
	PaymentMethod string
	Lines         []CreateRequestLine
	DiscountCents int64
}

// Create registers a sale and decrements inventory.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*domainsale.Sale, error) {
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	lines := make([]domainsale.Line, 0, len(req.Lines))
	var subtotal int64
	var taxTotal int64

	for _, reqLine := range req.Lines {
		product, err := s.products.GetByID(ctx, reqLine.ProductID)
		if err != nil {
			return nil, fmt.Errorf("load product %d: %w", reqLine.ProductID, err)
		}

		lineSubtotal := product.UnitPriceCents * reqLine.Quantity
		if reqLine.DiscountCents > lineSubtotal {
			return nil, errors.New("line discount exceeds subtotal")
		}

		lineTax := computeTax(lineSubtotal-reqLine.DiscountCents, product.TaxRate)
		lineTotal := lineSubtotal - reqLine.DiscountCents + lineTax

		lines = append(lines, domainsale.Line{
			ProductID:      product.ID,
			ProductName:    product.Name,
			SKU:            product.SKU,
			Quantity:       reqLine.Quantity,
			UnitPriceCents: product.UnitPriceCents,
			DiscountCents:  reqLine.DiscountCents,
			TaxCents:       lineTax,
			LineTotalCents: lineTotal,
		})

		subtotal += lineSubtotal
		taxTotal += lineTax
	}

	if req.DiscountCents > subtotal {
		return nil, errors.New("order discount exceeds subtotal")
	}

	draft := domainsale.Sale{
		SaleNumber:    req.SaleNumber,
		CustomerName:  req.CustomerName,
		SubtotalCents: subtotal,
		DiscountCents: req.DiscountCents,
		TaxCents:      taxTotal,
		TotalCents:    subtotal - req.DiscountCents + taxTotal,
		PaymentMethod: req.PaymentMethod,
		Status:        "COMPLETED",
		Lines:         lines,
	}

	created, err := s.repo.Create(ctx, draft)
	if err != nil {
		return nil, err
	}
	return created, nil
}

// List returns sales between dates.
func (s *Service) List(ctx context.Context, from, to time.Time) ([]domainsale.Sale, error) {
	if from.After(to) {
		return nil, errors.New("invalid date range")
	}
	return s.repo.List(ctx, from, to)
}

// Refund reverts a sale and restores stock.
func (s *Service) Refund(ctx context.Context, saleID int64) error {
	if saleID <= 0 {
		return errors.New("sale id required")
	}
	return s.repo.Refund(ctx, saleID)
}

func (s *Service) validateCreateRequest(req CreateRequest) error {
	if req.SaleNumber == "" {
		return errors.New("sale number required")
	}
	if req.PaymentMethod == "" {
		return errors.New("payment method required")
	}
	if len(req.Lines) == 0 {
		return errors.New("at least one line item required")
	}
	if req.DiscountCents < 0 {
		return errors.New("discount must be >= 0")
	}
	for _, line := range req.Lines {
		if line.ProductID == 0 {
			return errors.New("product id required")
		}
		if line.Quantity <= 0 {
			return errors.New("quantity must be > 0")
		}
		if line.DiscountCents < 0 {
			return errors.New("discount must be >= 0")
		}
	}
	return nil
}

func computeTax(amountCents int64, rate float64) int64 {
	if rate <= 0 {
		return 0
	}
	return int64(math.Round(float64(amountCents) * rate / 100.0))
}

var _ repository = (*sqlite.SaleRepository)(nil)
