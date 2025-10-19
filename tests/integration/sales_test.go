package integration

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	"shopmate/internal/domain/product"
	saleservice "shopmate/internal/services/sale"
)

func TestSaleCreateDecrementsStock(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	store := setupStore(t, ctx)

	productRepo := sqlite.NewProductRepository(store.DB())
	createProduct(t, ctx, productRepo, product.CreateInput{
		Name:           "Sample Item",
		SKU:            "SKU-001",
		UnitPriceCents: 1000,
		TaxRate:        5.0,
		StockQuantity:  10,
		ReorderLevel:   2,
	})

	saleSvc := saleservice.NewService(productRepo, sqlite.NewSaleRepository(store.DB()))

	sale, err := saleSvc.Create(ctx, saleservice.CreateRequest{
		SaleNumber:    "INV-001",
		PaymentMethod: "Cash",
		Lines: []saleservice.CreateRequestLine{{
			ProductID:     1,
			Quantity:      2,
			DiscountCents: 0,
		}},
	})
	if err != nil {
		t.Fatalf("create sale: %v", err)
	}

	if sale.TotalCents == 0 {
		t.Fatalf("expected total > 0, got %d", sale.TotalCents)
	}

	productAfter, err := productRepo.GetByID(ctx, 1)
	if err != nil {
		t.Fatalf("get product: %v", err)
	}

	expectedStock := int64(8)
	if productAfter.StockQuantity != expectedStock {
		t.Fatalf("expected stock %d, got %d", expectedStock, productAfter.StockQuantity)
	}
}

func TestSaleRefundRestoresStock(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	store := setupStore(t, ctx)

	productRepo := sqlite.NewProductRepository(store.DB())
	createProduct(t, ctx, productRepo, product.CreateInput{
		Name:           "Sample Item",
		SKU:            "SKU-002",
		UnitPriceCents: 1500,
		TaxRate:        0,
		StockQuantity:  5,
		ReorderLevel:   1,
	})

	saleRepo := sqlite.NewSaleRepository(store.DB())
	saleSvc := saleservice.NewService(productRepo, saleRepo)

	sale, err := saleSvc.Create(ctx, saleservice.CreateRequest{
		SaleNumber:    "INV-002",
		PaymentMethod: "Card",
		Lines: []saleservice.CreateRequestLine{{
			ProductID:     1,
			Quantity:      3,
			DiscountCents: 0,
		}},
	})
	if err != nil {
		t.Fatalf("create sale: %v", err)
	}

	if err := saleSvc.Refund(ctx, sale.ID); err != nil {
		t.Fatalf("refund sale: %v", err)
	}

	productAfter, err := productRepo.GetByID(ctx, 1)
	if err != nil {
		t.Fatalf("get product: %v", err)
	}

	expectedStock := int64(5)
	if productAfter.StockQuantity != expectedStock {
		t.Fatalf("expected stock %d after refund, got %d", expectedStock, productAfter.StockQuantity)
	}

	sales, err := saleRepo.List(ctx, time.Now().Add(-24*time.Hour), time.Now().Add(24*time.Hour))
	if err != nil {
		t.Fatalf("list sales: %v", err)
	}
	if len(sales) != 1 {
		t.Fatalf("expected 1 sale, got %d", len(sales))
	}
	if sales[0].Status != "REFUNDED" {
		t.Fatalf("expected status REFUNDED, got %s", sales[0].Status)
	}
}

func setupStore(t *testing.T, ctx context.Context) *sqlite.Store {
	t.Helper()
	tmp := t.TempDir()
	path := filepath.Join(tmp, "app.sqlite")

	store, err := sqlite.Open(ctx, path)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	t.Cleanup(func() { _ = store.Close() })

	return store
}

func createProduct(t *testing.T, ctx context.Context, repo *sqlite.ProductRepository, input product.CreateInput) {
	t.Helper()
	if _, err := repo.Create(ctx, input); err != nil {
		t.Fatalf("create product: %v", err)
	}
}
