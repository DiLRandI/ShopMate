package backup

import "time"

// Record represents a stored database backup snapshot.
type Record struct {
	ID        int64     `json:"id"`
	Filename  string    `json:"filename"`
	SizeBytes int64     `json:"sizeBytes"`
	CreatedAt time.Time `json:"createdAt"`
}
