package product

import (
	"errors"
	"fmt"
)

// Product represents a sellable item tracked in inventory.
type Product struct {
	ID                 int64  `json:"id"`
	Name               string `json:"name"`
	SKU                string `json:"sku"`
	Category           string `json:"category"`
	UnitPriceCents     int64  `json:"unitPriceCents"`
	TaxRateBasisPoints int64  `json:"taxRateBasisPoints"`
	CurrentQty         int64  `json:"currentQty"`
	ReorderLevel       int64  `json:"reorderLevel"`
	Notes              string `json:"notes"`
}

// CreateInput describes the fields required to add a product.
type CreateInput struct {
	Name               string
	SKU                string
	Category           string
	UnitPriceCents     int64
	TaxRateBasisPoints int64
	CurrentQty         int64
	ReorderLevel       int64
	Notes              string
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
	if in.TaxRateBasisPoints < 0 {
		return fmt.Errorf("tax rate must be >= 0 (got %d)", in.TaxRateBasisPoints)
	}
	if in.CurrentQty < 0 {
		return fmt.Errorf("current quantity must be >= 0 (got %d)", in.CurrentQty)
	}
	if in.ReorderLevel < 0 {
		return fmt.Errorf("reorder level must be >= 0 (got %d)", in.ReorderLevel)
	}
	return nil
}
