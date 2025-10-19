package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"shopmate/internal/domain/report"
)

// ReportRepository exposes aggregate reporting queries.
type ReportRepository struct {
	db *sql.DB
}

// NewReportRepository builds a report repository.
func NewReportRepository(db *sql.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// DailySummary aggregates totals for the provided date.
func (r *ReportRepository) DailySummary(ctx context.Context, date time.Time) (*report.DailySummary, error) {
	start := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	end := start.Add(24 * time.Hour)

	var summary report.DailySummary
	summary.Date = start

	row := r.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(total_cents),0), COUNT(id), COALESCE(SUM(tax_cents),0)
		FROM sales WHERE status = 'COMPLETED' AND created_at BETWEEN ? AND ?`, start, end)

	var total, count, tax int64
	if err := row.Scan(&total, &count, &tax); err != nil {
		return nil, fmt.Errorf("daily summary scan: %w", err)
	}
	summary.TotalSales = total
	summary.InvoiceCount = count
	summary.TaxCollected = tax
	if count > 0 {
		summary.AverageTicket = float64(total) / float64(count)
	}

	return &summary, nil
}

// TopProducts returns the best selling products for the date range.
func (r *ReportRepository) TopProducts(ctx context.Context, from, to time.Time, limit int) ([]report.TopProduct, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT product_id, MAX(product_name), SUM(quantity), SUM(line_total_cents)
		FROM sale_items
		INNER JOIN sales ON sales.id = sale_items.sale_id
		WHERE sales.status = 'COMPLETED' AND sales.created_at BETWEEN ? AND ?
		GROUP BY product_id
		ORDER BY SUM(line_total_cents) DESC
		LIMIT ?`, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("query top products: %w", err)
	}
	defer rows.Close()

	var tops []report.TopProduct
	for rows.Next() {
		var tp report.TopProduct
		if err := rows.Scan(&tp.ProductID, &tp.ProductName, &tp.QuantitySold, &tp.RevenueCents); err != nil {
			return nil, fmt.Errorf("scan top product: %w", err)
		}
		tops = append(tops, tp)
	}

	return tops, rows.Err()
}
