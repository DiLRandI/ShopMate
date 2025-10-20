package report

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"strconv"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	"shopmate/internal/domain/report"
)

// Service provides reporting use cases.
type Service struct {
	repo *sqlite.ReportRepository
}

// NewService constructs a report service.
func NewService(repo *sqlite.ReportRepository) *Service {
	return &Service{repo: repo}
}

// DailySummary fetches aggregated metrics for a day.
func (s *Service) DailySummary(ctx context.Context, date time.Time) (*report.DailySummary, error) {
	return s.repo.DailySummary(ctx, date)
}

// TopProducts returns the best performers within a range.
func (s *Service) TopProducts(ctx context.Context, from, to time.Time, limit int) ([]report.TopProduct, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.repo.TopProducts(ctx, from, to, limit)
}

// DailySummaryCSV renders the daily summary as CSV.
func (s *Service) DailySummaryCSV(ctx context.Context, date time.Time) ([]byte, error) {
	summary, err := s.DailySummary(ctx, date)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	if err := writer.Write([]string{"date", "total_sales_cents", "invoice_count", "average_ticket_cents", "tax_collected_cents"}); err != nil {
		return nil, fmt.Errorf("write header: %w", err)
	}
	record := []string{
		summary.Date.Format(time.RFC3339),
		strconv.FormatInt(summary.TotalSales, 10),
		strconv.FormatInt(summary.InvoiceCount, 10),
		strconv.FormatInt(int64(summary.AverageTicket+0.5), 10),
		strconv.FormatInt(summary.TaxCollected, 10),
	}
	if err := writer.Write(record); err != nil {
		return nil, fmt.Errorf("write row: %w", err)
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("flush csv: %w", err)
	}
	return buf.Bytes(), nil
}

// TopProductsCSV renders the top products report as CSV.
func (s *Service) TopProductsCSV(ctx context.Context, from, to time.Time, limit int) ([]byte, error) {
	products, err := s.TopProducts(ctx, from, to, limit)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)
	if err := writer.Write([]string{"product_id", "product_name", "quantity_sold", "revenue_cents"}); err != nil {
		return nil, fmt.Errorf("write header: %w", err)
	}

	for _, p := range products {
		record := []string{
			strconv.FormatInt(p.ProductID, 10),
			p.ProductName,
			strconv.FormatInt(p.QuantitySold, 10),
			strconv.FormatInt(p.RevenueCents, 10),
		}
		if err := writer.Write(record); err != nil {
			return nil, fmt.Errorf("write row: %w", err)
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("flush csv: %w", err)
	}
	return buf.Bytes(), nil
}
