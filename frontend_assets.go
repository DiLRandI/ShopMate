package shopmate

import "embed"

//go:embed frontend/dist
var frontendAssets embed.FS

// FrontendAssets exposes the embedded frontend bundle.
func FrontendAssets() embed.FS {
	return frontendAssets
}
