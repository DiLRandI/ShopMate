package report

import (
	"context"
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
