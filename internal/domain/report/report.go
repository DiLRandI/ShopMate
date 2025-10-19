package report

import "time"

// DailySummary captures headline metrics for a day.
type DailySummary struct {
	Date          time.Time `json:"date"`
	TotalSales    int64     `json:"totalSales"`
	InvoiceCount  int64     `json:"invoiceCount"`
	AverageTicket float64   `json:"averageTicket"`
	TaxCollected  int64     `json:"taxCollected"`
}

// TopProduct aggregates quantity and revenue metrics.
type TopProduct struct {
	ProductID    int64  `json:"productId"`
	ProductName  string `json:"productName"`
	QuantitySold int64  `json:"quantitySold"`
	RevenueCents int64  `json:"revenueCents"`
}
