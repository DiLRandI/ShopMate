package migrations

import "embed"

// Files provides access to embedded SQL migrations.
//
//go:embed *.sql
var Files embed.FS
