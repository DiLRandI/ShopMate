package sale_test

import (
	"context"
	"path/filepath"
	"testing"

	"shopmate/internal/adapters/storage/sqlite"
	productdomain "shopmate/internal/domain/product"
	"shopmate/internal/services/sale"
)

func TestSaleCreateAndRefund(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "integration.sqlite")

	store, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer store.Close()

	productRepo := sqlite.NewProductRepository(store.DB())
	saleRepo := sqlite.NewSaleRepository(store.DB())

	product, err := productRepo.Create(context.Background(), productdomain.CreateInput{
		Name:               "Coffee",
		SKU:                "SKU-C",
		UnitPriceCents:     500,
		TaxRateBasisPoints: 500,
		CurrentQty:         10,
		Category:           "Beverage",
	})
	if err != nil {
		t.Fatalf("create product: %v", err)
	}

	service := sale.NewService(productRepo, saleRepo)

	created, err := service.Create(context.Background(), sale.CreateRequest{
		SaleNumber:    "INV-001",
		CustomerName:  "Alice",
		PaymentMethod: "Cash",
		Lines:         []sale.CreateRequestLine{{ProductID: product.ID, Quantity: 2}},
	})
	if err != nil {
		t.Fatalf("create sale: %v", err)
	}

	if created.TotalCents == 0 {
		t.Fatalf("expected total cents calculated")
	}

	updatedProduct, err := productRepo.GetByID(context.Background(), product.ID)
	if err != nil {
		t.Fatalf("get product: %v", err)
	}
	if updatedProduct.CurrentQty != product.CurrentQty-2 {
		t.Fatalf("expected stock reduced, got %d", updatedProduct.CurrentQty)
	}

	if err := service.Refund(context.Background(), created.ID); err != nil {
		t.Fatalf("refund: %v", err)
	}

	refunded, err := saleRepo.GetByID(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("load sale: %v", err)
	}
	if refunded.Status != "Refunded" {
		t.Fatalf("expected status refunded, got %s", refunded.Status)
	}

	restoredProduct, err := productRepo.GetByID(context.Background(), product.ID)
	if err != nil {
		t.Fatalf("get product: %v", err)
	}
	if restoredProduct.CurrentQty != product.CurrentQty {
		t.Fatalf("expected stock restored to %d got %d", product.CurrentQty, restoredProduct.CurrentQty)
	}
}
