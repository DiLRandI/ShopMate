package sale

import "time"

// Filter represents the criteria for querying sales history.
type Filter struct {
	From           time.Time
	To             time.Time
	PaymentMethods []string
	Status         []string
	CustomerQuery  string
	Limit          int
	Offset         int
}

// Normalize ensures sane defaults for ranges and paging.
func (f *Filter) Normalize() {
	if f.To.IsZero() {
		f.To = time.Now()
	}
	if f.From.IsZero() || f.From.After(f.To) {
		f.From = f.To.Add(-30 * 24 * time.Hour)
	}
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 200
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
}
