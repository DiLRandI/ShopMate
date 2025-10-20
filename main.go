package main

import (
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"shopmate/internal/app"
	"shopmate/internal/logging"
)

func main() {
	env := os.Getenv("SHOPMATE_ENV")
	locale := os.Getenv("SHOPMATE_LOCALE")
	telemetry := os.Getenv("SHOPMATE_ENABLE_TELEMETRY") == "1"

	logger := logging.New(logging.Options{
		Env:             env,
		Locale:          locale,
		EnableTelemetry: telemetry,
	})

	application, err := app.New(logger)
	if err != nil {
		logger.Error("failed to initialise application", "error", err)
		os.Exit(1)
	}

	err = wails.Run(&options.App{
		Title:            "ShopMate",
		Width:            1280,
		Height:           830,
		MinWidth:         1024,
		MinHeight:        768,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		AssetServer: &assetserver.Options{
			Assets: frontendAssets,
		},
		OnStartup:  application.Startup,
		OnShutdown: application.Shutdown,
		Bind: []interface{}{
			application,
			application.Products(),
			application.Sales(),
			application.Reports(),
			application.Backups(),
			application.Settings(),
			application.Invoices(),
		},
	})
	if err != nil {
		logger.Error("failed to start Wails runtime", "error", err)
		os.Exit(1)
	}
}
