package sale

import "testing"

func TestComputeTax(t *testing.T) {
	tests := []struct {
		name   string
		amount int64
		rateBP int64
		want   int64
	}{
		{"zero", 0, 500, 0},
		{"noTax", 10000, 0, 0},
		{"basic", 10000, 500, 500},
		{"round", 3333, 775, 258},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := computeTax(tc.amount, tc.rateBP)
			if got != tc.want {
				t.Fatalf("computeTax(%d,%d) = %d want %d", tc.amount, tc.rateBP, got, tc.want)
			}
		})
	}
}

func TestValidateCreateRequest(t *testing.T) {
	base := CreateRequest{
		SaleNumber:    "INV-1",
		PaymentMethod: "Cash",
		Lines:         []CreateRequestLine{{ProductID: 1, Quantity: 1}},
		DiscountCents: 0,
	}

	invalids := []CreateRequest{
		{SaleNumber: "", PaymentMethod: "Cash", Lines: base.Lines},
		{SaleNumber: "INV", PaymentMethod: "", Lines: base.Lines},
		{SaleNumber: "INV", PaymentMethod: "Cash", Lines: nil},
	}

	for _, req := range invalids {
		if err := (&Service{}).validateCreateRequest(req); err == nil {
			t.Fatalf("expected error for request %+v", req)
		}
	}

	if err := (&Service{}).validateCreateRequest(base); err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}
}
