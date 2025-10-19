package product

import (
	"errors"
	"fmt"
)

// Product represents a sellable item tracked in inventory.
type Product struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	SKU            string  `json:"sku"`
	UnitPriceCents int64   `json:"unitPriceCents"`
	TaxRate        float64 `json:"taxRate"`
	StockQuantity  int64   `json:"stockQuantity"`
	ReorderLevel   int64   `json:"reorderLevel"`
	Notes          string  `json:"notes"`
}

// CreateInput describes the fields required to add a product.
type CreateInput struct {
	Name           string
	SKU            string
	UnitPriceCents int64
	TaxRate        float64
	StockQuantity  int64
	ReorderLevel   int64
	Notes          string
}

// Validate ensures the product input satisfies basic constraints.
func (in CreateInput) Validate() error {
	if len(in.Name) == 0 {
		return errors.New("name is required")
	}
	if len(in.SKU) == 0 {
		return errors.New("sku is required")
	}
	if in.UnitPriceCents < 0 {
		return fmt.Errorf("unit price must be >= 0 (got %d)", in.UnitPriceCents)
	}
	if in.TaxRate < 0 {
		return fmt.Errorf("tax rate must be >= 0 (got %f)", in.TaxRate)
	}
	if in.StockQuantity < 0 {
		return fmt.Errorf("stock quantity must be >= 0 (got %d)", in.StockQuantity)
	}
	if in.ReorderLevel < 0 {
		return fmt.Errorf("reorder level must be >= 0 (got %d)", in.ReorderLevel)
	}
	return nil
}
