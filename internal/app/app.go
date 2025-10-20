package app

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"shopmate/internal/adapters/storage/sqlite"
	backupservice "shopmate/internal/services/backup"
	productservice "shopmate/internal/services/product"
	reportservice "shopmate/internal/services/report"
	saleservice "shopmate/internal/services/sale"
	backupapi "shopmate/internal/wailsapi/backup"
	productapi "shopmate/internal/wailsapi/product"
	reportapi "shopmate/internal/wailsapi/report"
	saleapi "shopmate/internal/wailsapi/sale"
)

const defaultDBFile = "data/app.sqlite"

// App coordinates backend services exposed to the Wails runtime.
type App struct {
	ctx      context.Context
	logger   *slog.Logger
	store    *sqlite.Store
	products *productapi.API
	sales    *saleapi.API
	reports  *reportapi.API
	backups  *backupapi.API
}

// New constructs the application shell with its dependencies.
func New(logger *slog.Logger) (*App, error) {
	dbPath := os.Getenv("SHOPMATE_DB_PATH")
	if dbPath == "" {
		dbPath = defaultDBFile
	}

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}

	store, err := sqlite.Open(context.Background(), dbPath)
	if err != nil {
		return nil, fmt.Errorf("open store: %w", err)
	}

	productRepo := sqlite.NewProductRepository(store.DB())
	saleRepo := sqlite.NewSaleRepository(store.DB())
	reportRepo := sqlite.NewReportRepository(store.DB())
	backupRepo := sqlite.NewBackupRepository(store.DB())

	productSvc := productservice.NewService(productRepo)
	saleSvc := saleservice.NewService(productRepo, saleRepo)
	reportSvc := reportservice.NewService(reportRepo)
	backupSvc := backupservice.NewService(backupRepo, store.Path())

	app := &App{
		logger: logger,
		store:  store,
	}
	app.products = productapi.New(productSvc, app.runtimeContext)
	app.sales = saleapi.New(saleSvc, app.runtimeContext)
	app.reports = reportapi.New(reportSvc)
	app.backups = backupapi.New(backupSvc)

	return app, nil
}

// Startup stores the lifecycle context from Wails for later use.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.logger.InfoContext(ctx, "app.startup")
}

// Shutdown releases resources when the runtime exits.
func (a *App) Shutdown(ctx context.Context) {
	a.logger.InfoContext(ctx, "app.shutdown")
	if err := a.store.Close(); err != nil {
		a.logger.ErrorContext(ctx, "store.close", slog.String("error", err.Error()))
	}
}

// HealthPing returns a simple runtime heartbeat for smoke tests.
func (a *App) HealthPing(message string) string {
	if message == "" {
		message = "pong"
	}
	a.logger.DebugContext(a.ctx, "app.health_ping", slog.String("message", message))
	return message
}

// Products exposes the product API bridge for frontend binding.
func (a *App) Products() *productapi.API {
	return a.products
}

// Sales exposes sale API.
func (a *App) Sales() *saleapi.API {
	return a.sales
}

// Reports exposes reporting bridge.
func (a *App) Reports() *reportapi.API {
	return a.reports
}

// Backups exposes backup controls.
func (a *App) Backups() *backupapi.API {
	return a.backups
}

func (a *App) runtimeContext() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}
