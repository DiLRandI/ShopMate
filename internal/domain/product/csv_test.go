package product_test

import (
	"bytes"
	"strings"
	"testing"

	"shopmate/internal/domain/product"
)

func TestParseImportCSV(t *testing.T) {
	csv := "sku,name,category,unit_price,tax_rate_percent,current_qty,reorder_level,notes\n" +
		"SKU-1,Milk,Dairy,99.99,5,10,2,Fresh milk\n" +
		"SKU-2,Bread,Bakery,2.50,0,5,1,"

	rows, err := product.ParseImportCSV(strings.NewReader(csv))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}

	first := rows[0]
	if first.SKU != "SKU-1" {
		t.Fatalf("expected SKU-1, got %s", first.SKU)
	}
	if first.UnitPriceCents != 9999 {
		t.Fatalf("expected price 9999, got %d", first.UnitPriceCents)
	}
	if first.TaxRateBasisPts != 500 {
		t.Fatalf("expected tax 500, got %d", first.TaxRateBasisPts)
	}
}

func TestWriteExportCSV(t *testing.T) {
	products := []product.Product{
		{SKU: "A", Name: "Item", Category: "General", UnitPriceCents: 1234, TaxRateBasisPoints: 250, CurrentQty: 4, ReorderLevel: 2, Notes: "note"},
	}

	var buf bytes.Buffer
	if err := product.WriteExportCSV(&buf, products); err != nil {
		t.Fatalf("write csv failed: %v", err)
	}

	output := buf.String()
	if !strings.Contains(output, "Item") || !strings.Contains(output, "12.34") {
		t.Fatalf("unexpected output: %s", output)
	}
}
