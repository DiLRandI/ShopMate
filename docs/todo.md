# ShopMate v1.0 Implementation Checklist

## Foundation & Schema
- [x] Align SQLite schema with PRD (money in cents, tax basis points, `ts` columns, settings KV, indexes, triggers)
- [x] Add migration for WAL defaults, backup tables, and retention metadata
- [x] Embed migration runner and ensure idempotent startup
- [x] Provide sample seed data and CSV templates under `data/` per contracts

## Backend Services & APIs
- [ ] Implement product CRUD incl. bulk CSV import/export and stock adjustments
- [ ] Extend sales service with listing, filtering, refund/void flows, and stock ledger updates
- [ ] Generate invoices (HTML/PDF) and expose history retrieval via Wails bridge
- [ ] Add reporting service for daily summary, top products, CSV exports
- [ ] Implement settings + owner PIN storage with validation helpers
- [ ] Wrap all Wails APIs in `{ok:boolean, data?:T, error?:string}` envelope and map domain errors
- [ ] Schedule automatic backups (exit + midnight), manual backup/restore, retention policy (30 days)
- [ ] Add localized logging + error telemetry toggles in shared logging package

## Frontend Application
- [ ] Build multi-page shell (Dashboard, POS, Products, Sales, Reports, Settings) with routing/nav
- [ ] Implement onboarding flow (shop profile, default tax, optional CSV import)
- [ ] Surface low-stock indicators and badge counts in sidebar/status chip
- [ ] Complete POS experience (scan/search, discounts, payment methods, print/share PDF)
- [ ] Create Sales history UI with filters, invoice preview/print, refund trigger (owner PIN)
- [ ] Deliver Reports dashboard with charts, CSV exports, and date filters
- [ ] Build Settings area for shop profile, invoice template, backup controls, security PIN
- [ ] Ensure PDF/CSV export actions integrate with backend bridges
- [ ] Add accessibility, high-contrast theme toggle, and keyboard shortcuts

## Testing & Verification
- [ ] Add table-driven unit tests for pricing/tax math, CSV validation, settings, backups
- [ ] Create integration tests for sale create/refund, report queries, backup lifecycle
- [ ] Wire frontend Vitest suites and React Testing Library coverage for critical flows
- [ ] Document manual verification steps (`make lint`, `make test`, targeted `make dev` checks)
- [ ] Capture test results and known gaps in PR/commit notes

## Documentation & Ops
- [ ] Update `docs/prd.md` status annotations or changelog as features complete
- [ ] Expand technical architecture doc with new modules, data paths, and tooling
- [ ] Provide restore guide and troubleshooting tips (logs, integrity check)
- [ ] Outline release packaging steps (wails build targets, signing checklist)
- [ ] Track open questions/TODOs with issue IDs inside code where applicable
