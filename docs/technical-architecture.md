# ShopMate Technical Architecture (2025-10-25)

## Purpose
This document captures the current architecture of the ShopMate desktop application as shipped on 2025-10-25. It documents the Go + Wails backend, the React + Vite frontend, data persistence choices, and the major cross-cutting systems so contributors have an accurate reference point.

## Stack Overview
- **Backend:** Go 1.25.3, Wails 2.10.2, SQLite (modernc.org/sqlite driver).
- **Frontend:** React 18, TypeScript 5.9, Vite 6 (SWC plugin), Tailwind CSS 4 utilities.
- **Tooling & Tests:** Go test/vet, Vitest + Testing Library, ESLint/Prettier, Makefile automation.

## Repository Layout
```
ShopMate/
├── main.go                      # Wails bootstrap
├── frontend_assets.go           # go:embed bundle for compiled frontend
├── internal/
│   ├── app/                     # application wiring and lifecycle
│   ├── adapters/
│   │   └── storage/sqlite       # Store wrapper + repositories
│   ├── domain/                  # domain models (product, sale, report, settings, backup)
│   ├── logging/                 # slog construction helpers
│   ├── services/                # business logic (product, sale, report, invoice, backup, settings)
│   └── wailsapi/                # Go → frontend bridges returning envelopes
├── migrations/                  # SQL migrations embedded at build time
├── frontend/
│   ├── package.json             # npm dependencies & scripts
│   └── src/
│       ├── app/                 # App shell, layout, providers
│       ├── components/          # shared UI components
│       ├── features/            # feature folders (products, pos, reports, settings, onboarding)
│       ├── pages/               # page-level entry points
│       ├── services/            # Wails client helpers
│       ├── state/               # simple shared state utilities
│       ├── themes/              # theme tokens & Tailwind hooks
│       └── utils/               # shared calculations (money, totals)
├── docs/                        # PRD, architectural reference, restore guide, task list
├── data/                        # development database, backups, seed templates
├── Makefile                     # dev/build/test/lint automation
├── wails.json                   # Wails project configuration
├── go.mod / go.sum
└── README.md
```

## Backend Composition
### Entry Point & Lifecycle
- `main.go` reads `SHOPMATE_ENV`, `SHOPMATE_LOCALE`, and `SHOPMATE_ENABLE_TELEMETRY`, builds the slog logger, initialises the `internal/app.App`, and starts the Wails runtime.
- `internal/app.App` owns the shared SQLite store, constructs repositories and services, binds Wails APIs, and manages lifecycle hooks:
  - `Startup`: captures the runtime context and starts the nightly backup scheduler.
  - `Shutdown`: stops the scheduler, triggers a final backup, and closes the store.

### Persistence
- `internal/adapters/storage/sqlite.Open` configures SQLite with WAL mode, busy timeout, foreign keys, and applies embedded migrations.
- Repositories (`ProductRepository`, `SaleRepository`, `ReportRepository`, `BackupRepository`, `SettingsRepository`) encapsulate SQL and enforce constraints (stock checks, retention trimming, profile defaults).
- Database file defaults to `data/app.sqlite`; manual overrides use `SHOPMATE_DB_PATH`.

### Services
- `services/product`: validation, CRUD, stock adjustments, CSV import/export, low-stock counts.
- `services/sale`: sale creation with tax/discount math, list/filter, refund, void (restocking), plus dependency on `ProductRepository` for lookups.
- `services/report`: aggregates daily summary and top-product metrics, produces CSV exports.
- `services/backup`: creates backups, restores snapshots (with automatic pre-restore capture), enforces retention, and runs the nightly scheduler.
- `services/settings`: stores shop profile & UI preferences, handles owner PIN hashing/verification (bcrypt), and exposes convenience helpers (`HasOwnerPIN`). PIN checks are not yet enforced elsewhere in the app.
- `services/invoice`: renders invoices via Go templates, produces lightweight PDF output without external binaries.

### Wails API Bridges
Each bridge returns a `response.Envelope[T]` (`{ok, data, error}`) to keep frontend error handling uniform.
- `product.API`: create, list, update, delete, adjust stock, CSV import/export, low-stock count.
- `sale.API`: create sale, list with filters, fetch single sale, refund, void.
- `report.API`: daily summary, top products, CSV exports for both reports.
- `backup.API`: create backup, list recent backups, restore by filename, update retention.
- `settings.API`: get/save profile, get/save preferences, set/verify/clear/has owner PIN.
- `invoice.API`: generate invoice HTML or PDF for a given sale.
- `app.App`: exposes a simple `HealthPing` for smoke tests through Wails binding.

### Logging & Telemetry
- `internal/logging` builds slog loggers with per-environment handling (JSON for production, pretty text with source metadata for development).
- Telemetry toggle attaches a noop handler placeholder for future sinks; errors ≥ `Error` level include telemetry metadata when enabled.
- All services log through the shared logger, ensuring consistent context keys.

### Background Work
- `backup.Service` scheduler calculates next midnight in app local time and triggers backups; scheduler shuts down gracefully when the runtime stops.
- No other background workers run today; future scheduled tasks should reuse the same cancellation pattern.

### Known Gaps
- No authentication or role enforcement is wired yet; all APIs assume trusted local access.
- Owner PIN storage exists but destructive flows (refund, void, restore) do not yet prompt for it.
- Margin and discount guardrail features are not implemented in repositories or services.
- Margin variance reporting endpoints are not present.

## Frontend Composition
### App Shell & Navigation
- `src/app/App.tsx` orchestrates initial data fetch (profile, preferences, low stock), maintains navigation state, and wires keyboard shortcuts (`Alt+1..5`, `Alt+D`).
- `AppShell` renders the layout, low-stock badge, dark-mode toggle, and emits status messages.
- Onboarding modal prompts for shop profile and optional product import when the profile is incomplete.

### Feature Folders
- `features/products`: Wails client, product table, product form, CSV import/export wiring, stock adjustment UI.
- `features/pos`: cart management, totals calculation, sale submission, invoice dialog.
- `features/reports`: API helpers, daily summary/top products UI, CSV download utilities.
- `features/settings`: profile/preferences forms, owner PIN management, shared currency formatter context.
- `features/onboarding`: first-run wizard.
- Shared styles use Tailwind utility classes defined in `frontend/src/themes` and the global Tailwind config.

### State & Utilities
- Local component state (React hooks) drives most flows. Shared context (`ShopProfileProvider`) exposes profile + currency helpers.
- Utilities handle money parsing/formatting, discount math, and encoding (base64 → Uint8Array).
- Dark-mode state persists via backend preferences; toggling updates both DOM class and stored preferences.

### Testing & Quality
- Vitest suites cover POS totals (`features/pos/utils.test.ts`) and App shell navigation (`app/AppShell.test.tsx`).
- Go unit tests cover product CSV parsing, settings serialization, backup retention, and invoice helpers.
- ESLint/Prettier enforce code style; `npm run lint` and `npm run test` are invoked via the Makefile.

## Build & Delivery
- `Makefile` targets:
  - `make deps` installs Go modules and npm dependencies.
  - `make dev` runs `wails dev` for backend + frontend live reload.
  - `make build` produces platform binaries via `wails build`.
  - `make lint` runs `go vet` and frontend linting; `make test` runs Go tests and Vitest.
  - `make tidy` formats Go code and runs frontend formatting.
- `frontend_assets.go` embeds the production build into the Go binary for distribution.
- Release packaging follows the documented checklist in `docs/prd.md` and `docs/restore-guide.md`.

## Operational Notes
- Database and backups live under `data/` by default (`data/app.sqlite`, `data/backups/`).
- Manual restore flow copies the selected backup, records a pre-restore snapshot, then swaps the primary DB.
- Owner PIN hashing relies on bcrypt; verification logic enforces numeric PINs (4–10 digits).
- Shutdown creates a final backup before closing the store, ensuring operator-triggered restores always have a recent snapshot.

## Roadmap Considerations
- Introduce authentication modules (`internal/auth`, Wails middleware, frontend login screens) before distributing to stores with multiple operators.
- Extend schema and services to support margin/max-discount guardrails and expose them through POS + reporting.
- Evaluate persistent global state (e.g., Zustand) once authentication and role-aware routing are introduced.
- Plan for ESC/POS printing, purchase orders, and localisation after the v1.0 authentication milestone.
