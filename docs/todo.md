# ShopMate v1.0 Implementation Checklist

Updated: 2025-10-25

## Completed
- [x] Align SQLite schema with platform requirements (integer cents, basis points, millisecond timestamps, KV settings, indexes, triggers).
- [x] Embed migrations in the binary and initialise the shared SQLite store with WAL defaults and backup metadata tables.
- [x] Provide sample data and CSV templates in `data/` for onboarding and testing.
- [x] Deliver product CRUD with CSV import/export, stock adjustments, and low-stock counts exposed to the UI.
- [x] Implement sales creation, listing, filtering, refund, and void flows with stock ledger updates.
- [x] Render invoices as HTML/PDF through the invoice service and expose the bridge for printing/sharing.
- [x] Ship reporting for daily summaries and top products, including CSV export helpers.
- [x] Implement settings/profile management with locale, dark-mode, telemetry preferences, and hashed owner PIN support.
- [x] Wrap all Wails APIs in the `{ok, data, error}` envelope to keep frontend error handling consistent.
- [x] Add automated backups (nightly + shutdown), manual backup/restore, and retention management.
- [x] Provide logging helpers with telemetry toggles and development-friendly text output.
- [x] Build the multi-page desktop shell (Dashboard, POS, Sales, Reports, Settings) with navigation shortcuts and dark-mode toggle.
- [x] Create onboarding wizard for initial profile setup and optional product import.
- [x] Surface low-stock status in the shell badge and refresh counts after inventory changes.
- [x] Complete POS workflow with search, per-line and order-level discounts, payment method capture, invoice preview, and PDF download.
- [x] Deliver Sales history UI with filters, refund/void actions, and invoice reprint dialog.
- [x] Publish the Reports page with date filters, daily snapshot metrics, top products list, and CSV exports.
- [x] Build Settings UI covering profile/preferences editing and owner PIN management with verification/clear actions.
- [x] Add unit tests for key Go packages (product CSV parsing, settings, backups) and Vitest coverage for POS utilities/App shell.
- [x] Document restore steps, release packaging checklist, and contributor handbook.

## Outstanding for v1.0 Launch
- [ ] Add local authentication: users table, password hashing helpers, login/logout/session Wails API, and app boot gating.
- [ ] Implement role-based authorisation (ADMIN vs OPERATOR) and block admin routes for operators.
- [ ] Build user management UX in Settings (“Team Members”) with create/edit/deactivate flows.
- [ ] Extend schema, domain models, import/export contracts, and POS forms with product margin and maximum discount fields.
- [ ] Enforce discount guardrails in POS and stock services, surfacing inline warnings when overrides exceed configured margins.
- [ ] Expose discount suggestion toggle and related settings, wiring them into the frontend state.
- [ ] Add margin variance reporting (backend aggregations, CSV export, and frontend table/flag indicators).
- [ ] Require owner PIN confirmation on destructive flows (refund, void, restore) once auth is available.
- [ ] Harden Wails middleware with session awareness once authentication lands (context propagation, request guards).

## Backlog / Post-v1.0 Opportunities
- [ ] ESC/POS raw printing for faster thermal receipts.
- [ ] Purchase/stock-in workflow and supplier management.
- [ ] Multi-language/localization support beyond `en-US`.
- [ ] Optional cloud/off-site backup integrations.
- [ ] Advanced analytics (customer profiles, margin dashboards) once foundational discount data exists.
