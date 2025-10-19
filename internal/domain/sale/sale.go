package sale

import (
	"errors"
	"fmt"
)

// Line represents a sale line item.
type Line struct {
	ProductID      int64  `json:"productId"`
	ProductName    string `json:"productName"`
	SKU            string `json:"sku"`
	Quantity       int64  `json:"quantity"`
	UnitPriceCents int64  `json:"unitPriceCents"`
	DiscountCents  int64  `json:"discountCents"`
	TaxCents       int64  `json:"taxCents"`
	LineTotalCents int64  `json:"lineTotalCents"`
}

// Sale aggregates invoice information.
type Sale struct {
	ID            int64  `json:"id"`
	SaleNumber    string `json:"saleNumber"`
	CustomerName  string `json:"customerName"`
	SubtotalCents int64  `json:"subtotalCents"`
	DiscountCents int64  `json:"discountCents"`
	TaxCents      int64  `json:"taxCents"`
	TotalCents    int64  `json:"totalCents"`
	PaymentMethod string `json:"paymentMethod"`
	Status        string `json:"status"`
	Lines         []Line `json:"lines"`
}

// Draft represents the data needed to save a sale.
type Draft struct {
	SaleNumber    string
	CustomerName  string
	PaymentMethod string
	Lines         []DraftLine
}

// DraftLine is the incoming data for one line during creation.
type DraftLine struct {
	ProductID      int64
	ProductName    string
	SKU            string
	Quantity       int64
	UnitPriceCents int64
	DiscountCents  int64
	TaxCents       int64
}

// Validate ensures the draft meets business constraints.
func (d Draft) Validate() error {
	if d.SaleNumber == "" {
		return errors.New("sale number required")
	}
	if len(d.Lines) == 0 {
		return errors.New("at least one line item required")
	}
	if d.PaymentMethod == "" {
		return errors.New("payment method required")
	}
	for i, line := range d.Lines {
		if line.ProductID == 0 {
			return fmt.Errorf("line %d: product id required", i)
		}
		if line.Quantity <= 0 {
			return fmt.Errorf("line %d: quantity must be > 0", i)
		}
		if line.UnitPriceCents < 0 {
			return fmt.Errorf("line %d: unit price must be >= 0", i)
		}
		if line.DiscountCents < 0 {
			return fmt.Errorf("line %d: discount must be >= 0", i)
		}
		if line.TaxCents < 0 {
			return fmt.Errorf("line %d: tax must be >= 0", i)
		}
	}
	return nil
}
