# ShopMate v1.0 Implementation Checklist

## Foundation & Schema
- [x] Align SQLite schema with PRD (money in cents, tax basis points, `ts` columns, settings KV, indexes, triggers)
- [x] Add migration for WAL defaults, backup tables, and retention metadata
- [x] Embed migration runner and ensure idempotent startup
- [x] Provide sample seed data and CSV templates under `data/` per contracts

## Backend Services & APIs
- [x] Implement product CRUD incl. bulk CSV import/export and stock adjustments
- [x] Extend sales service with listing, filtering, refund/void flows, and stock ledger updates
- [x] Generate invoices (HTML/PDF) and expose history retrieval via Wails bridge
- [x] Add reporting service for daily summary, top products, CSV exports
- [x] Implement settings + owner PIN storage with validation helpers
- [x] Wrap all Wails APIs in `{ok:boolean, data?:T, error?:string}` envelope and map domain errors
- [x] Schedule automatic backups (exit + midnight), manual backup/restore, retention policy (30 days)
- [x] Add localized logging + error telemetry toggles in shared logging package

## Frontend Application
- [x] Build multi-page shell (Dashboard, POS, Products, Sales, Reports, Settings) with routing/nav
- [x] Implement onboarding flow (shop profile, default tax, optional CSV import)
- [x] Surface low-stock indicators and badge counts in sidebar/status chip
- [x] Complete POS experience (scan/search, discounts, payment methods, print/share PDF)
- [x] Create Sales history UI with filters, invoice preview/print, refund trigger (owner PIN)
- [x] Deliver Reports dashboard with charts, CSV exports, and date filters
- [x] Build Settings area for shop profile, invoice template, backup controls, security PIN
- [x] Ensure PDF/CSV export actions integrate with backend bridges
- [x] Add accessibility, dark theme toggle, and keyboard shortcuts

## Testing & Verification
- [x] Add table-driven unit tests for pricing/tax math, CSV validation, settings, backups
- [x] Create integration tests for sale create/refund, report queries, backup lifecycle
- [x] Wire frontend Vitest suites and React Testing Library coverage for critical flows
- [x] Document manual verification steps (`make lint`, `make test`, targeted `make dev` checks)
- [x] Capture test results and known gaps in PR/commit notes

## Documentation & Ops
- [x] Update `docs/prd.md` status annotations or changelog as features complete
- [x] Expand technical architecture doc with new modules, data paths, and tooling
- [x] Provide restore guide and troubleshooting tips (logs, integrity check)
- [x] Outline release packaging steps (wails build targets, signing checklist)
- [x] Track open questions/TODOs with issue IDs inside code where applicable
