# ShopMate Technical Architecture (2025-10-19)

## Purpose
This document describes the recommended repository layout, tooling baselines, and engineering conventions for the ShopMate Wails (Go + React) desktop application. It aligns the Go 1.25.3 backend, React/Vite frontend, and build automation so contributors share a consistent starting point.

## Backend: Go 1.25.3 + Wails

### Toolchain Baseline
- Target Go 1.25.3 to take advantage of new runtime, toolchain, and library capabilities, including DWARF v5 debug info, the `sync.WaitGroup.Go` helper, and upgrades to `testing/synctest`, `encoding/json/v2`, and `log/slog` (GroupAttrs, `Record.Source`). citeturn6search0
- Enable experiments selectively:
  - `GOEXPERIMENT=jsonv2` for high-throughput JSON import/export benchmarks.
  - `GOEXPERIMENT=greenteagc` in profiling builds to validate GC improvements before enabling for production.

### Repository Layout
- Prefer a modular layout rooted in `cmd`, `internal`, and feature-oriented packages to balance clarity and encapsulation. Keep the entrypoint thin and isolate reusable code from application-specific logic. citeturn1search0turn1search1turn1search8
- Recommended structure (subset):

```
.
├── cmd/
│   └── shopmate-desktop/      # main Wails bootstrap; wire dependencies only
├── internal/
│   ├── app/                   # orchestration layer (dependency injection)
│   ├── domain/                # entities + value objects (products, sales, taxes)
│   ├── services/              # use cases, reporting engines
│   ├── adapters/
│   │   ├── storage/           # SQLite repositories, migrations
│   │   ├── invoicing/         # invoice rendering + PDF hooks
│   │   └── backup/            # backup scheduler + retention
│   └── wailsapi/              # backend → frontend bindings
├── pkg/                       # exportable utilities (only if reused externally)
├── migrations/                # SQL files embedded via //go:embed
├── scripts/                   # helper scripts (linting, asset sync)
└── wails.json                 # Wails project configuration
```

- Keep `internal` relatively flat; factor packages by domain (inventory, billing, reports) instead of technical layers once modules grow. citeturn1search0turn1search4

### Logging with `log/slog`
- Adopt `slog` as the default logger. Create a centralized logger factory that:
  - Configures JSON handlers for production and human-readable handlers for development.
  - Adds contextual groups (`WithGroup`) for subsystems (e.g., `db`, `http`, `backup`).
  - Enriches errors with stack traces via helper adapters. citeturn7search1turn7search3
- Leverage Go 1.25 additions (`GroupAttrs`, `Record.Source`) to attach source metadata while keeping production logging lightweight. citeturn6search0

### Persistence & Concurrency
- Continue using SQLite (WAL mode) but wrap DB access in repositories that validate business invariants server-side.
- Use `sync.WaitGroup.Go` for structured fan-out work (e.g., concurrent export generation) to avoid manual counter management. citeturn6search0
- For concurrent testing, exercise workflows with `testing/synctest` to catch timing bugs in stock adjustments and backup scheduling. citeturn6search0

### Backup & Restore Lifecycle
- `internal/services/backup` now schedules nightly snapshots (next-midnight ticker) and on-shutdown backups. Retention defaults to 30 and trims both files and metadata for older entries using millisecond-resolution filenames.
- Manual restore copies the selected snapshot, records a pre-restore backup automatically, and is covered by integration tests in `service_test.go`.
- All backup metadata lives in `backup_settings` and `backups`; helpers expose `Create`, `List`, `Restore`, and `SetRetention` to the Wails bridge.

### Settings & Security
- `internal/services/settings` wraps the `settings` table, exposes profile/preferences APIs, and hashes owner PINs via `bcrypt` with validation helpers. `VerifyOwnerPIN` and `ClearOwnerPIN` gate sensitive operations.
- Preferences track locale, high-contrast mode, and telemetry toggles consumed by the logging factory and UI shell.

### Invoice Rendering & Reporting
- `internal/services/invoice` renders deterministic HTML templates (Go `html/template`) and emits lightweight PDFs via a handwritten writer (no external binary dependency). Wails API exposes base64 payloads for printing/downloading.
- Reporting service adds CSV export helpers for daily summaries and top products; frontend buttons trigger base64 downloads and reflect the same calculations used in Go tests.

### Wails Bridge Contract
- All exported Go APIs now return a generic `response.Envelope[T]` ensuring `{ok,data,error}` semantics. Frontend wrappers unwrap envelopes consistently via `services/wailsResponse.ts`.
- New bridges: `settings.API`, `invoice.API`, extended `backup.API`, `product.API` (CRUD/import/export), and `sale.API` (filters + void/refund).

### Testing & Tooling
- Place unit tests alongside implementation packages (`*_test.go`) and use table-driven tests for domain logic. citeturn1search0
- Add integration tests under `tests/` (or `internal/tests/`) for end-to-end Wails calls and database migrations.

## Frontend: React + Vite

### Tooling Baseline
- Require Node.js ≥ 20.19 and Vite 6 (current `vite.dev` line) to stay within supported browser baselines; scaffold with `npm create vite@latest … --template react-swc`. citeturn10search1turn2search2
- Prefer the SWC variant of `@vitejs/plugin-react` for faster HMR and builds on larger codebases. citeturn2search2
- Configure TypeScript in strict mode with modern targets (`ES2022`, `moduleResolution: "bundler"`) to align with Vite’s ESM pipeline. citeturn2search1

### Directory Layout
- Organize `src/` by features with page-level entry folders and colocated assets/tests to improve discoverability as the POS grows. citeturn2search0turn10search3
- Suggested hierarchy:

```
frontend/
├── src/
│   ├── app/                     # AppShell, router, providers
│   ├── features/
│   │   ├── inventory/
│   │   ├── billing/
│   │   ├── reports/
│   │   └── backups/
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── PosSale/
│   │   └── Settings/
│   ├── components/              # cross-feature UI primitives
│   ├── hooks/
│   ├── services/                # API clients wrapping Wails bindings
│   ├── state/                   # Zustand/RTK slices (if adopted)
│   ├── themes/
│   ├── utils/
│   └── main.tsx
├── public/
│   └── index.html
└── vite.config.ts
```

- Limit folder depth to keep imports manageable and collocate tests/story files with their components. citeturn2search0

### Build & Performance Practices
- Add Rollup manual chunks for vendor dependencies (`react`, `react-dom`) to improve incremental updates while keeping default code splitting. citeturn2search1
- Define path aliases in `vite.config.ts` (e.g., `@/features/*`) to avoid brittle relative imports. citeturn2search2
- Use strict TypeScript, React error boundaries, and modern image/lazy-loading patterns to maintain perceived performance. citeturn2search1turn2search10
- Prefer Vitest and ESLint/Prettier for automated quality gates when the frontend scaffolding is generated. citeturn2search10

## Cross-Cutting Build Automation
- Provide a `Makefile` wrapper for common tasks: `make dev` (Wails dev server + frontend), `make build` (production binary), `make lint`, and `make test`. This keeps the workflow consistent across platforms and CI. Wails CLI commands (`wails dev`, `wails build`) remain the single source of truth. citeturn11search0turn11search1turn10search1
- Document environment variables (e.g., `GOEXPERIMENT`, `NODE_ENV`) inside the Make targets or `.env.example` files to simplify onboarding.

### Release Packaging Checklist
1. `npm ci && npm run build` – compile the React bundle with strict TS checks.
2. `GOOS=<target> GOARCH=<arch> wails build -clean` – produce platform binaries; artifacts land under `build/bin/<target>`.
3. Code-sign outputs (`signtool` on Windows, `codesign`/`notarize` on macOS) using credentials stored outside the repo.
4. Zip installers with versioned naming (`ShopMate-v1.0.0-win64.zip`, etc.) and attach checksum manifests.
5. Smoke test each build: launch, run POS flow, verify reports/export, confirm backups folder created.

## Combined Repository Snapshot

```
ShopMate/
├── Makefile
├── go.mod
├── go.sum
├── wails.json
├── cmd/
│   └── shopmate-desktop/main.go
├── internal/
│   ├── app/
│   ├── domain/
│   ├── services/
│   ├── adapters/
│   └── wailsapi/
├── migrations/
├── frontend/
│   ├── package.json
│   ├── src/
│   └── vite.config.ts
├── docs/
│   ├── prd.md
│   └── technical-architecture.md
└── tests/
    ├── integration/
    └── smoke/
```

This blueprint should be adapted pragmatically—keep the structure lean during early development and evolve as features warrant additional separation.
