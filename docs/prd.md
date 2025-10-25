ShopMate — Product Requirements Document (PRD)
=============================================

Updated: 2025-10-25

## 0) Overview

**Goal**  
Deliver a fast, offline-first desktop application that small retailers can install and use immediately. ShopMate combines a Go + Wails backend with a React frontend, stores data in a bundled SQLite database, and focuses on day-to-day product management, billing, and lightweight insights without requiring cloud services.

**Primary Users**
- Shop owner / administrator (full access, responsible for configuration and backups)
- Store staff POS operator (focused on billing and receipts)

**Platforms**  
Windows 10/11, macOS (Intel/ARM), and Linux (Ubuntu LTS). The app ships as a single binary per platform.

**Non-Goals (v1.0)**
- Real-time cloud sync or multi-device live concurrency
- Advanced accounting (GL, ledgers, P&L)
- Purchase order workflow and supplier management
- Complex tax regimes beyond flat/item tax rates
- External compliance integrations (PCI DSS, SOC 2) for authentication

## Status Snapshot (2025-10-25)

### Completed in the current desktop build
- Inventory management (create/edit/delete), manual stock adjustments, CSV import/export, and low-stock badge.
- POS flow with search, per-line and order-level discounts, tax calculation, sale number generation, PDF invoice rendering, and stock decrement.
- Sales history list with filters, single-sale view, refund and void actions, and invoice reprint dialog.
- Reporting dashboards for daily summaries and top products with date filters and CSV downloads.
- Settings area covering shop profile, currency and tax defaults, UI preferences (locale, dark mode, telemetry), and owner PIN management (bcrypt hashed).
- Onboarding wizard for first-run profile setup and optional CSV import; dark theme toggle and keyboard shortcuts (Alt+1..5, Alt+D).
- Backup service with nightly + shutdown backups, manual backup/restore, retention management, and restore guide.

### Outstanding for v1.0 launch readiness
- Local authentication and role-based navigation (admin/operator) including users table, Wails auth middleware, login screen, and team management UI.
- Product margin and maximum discount fields flowing through schema, domain models, CSV contracts, and POS guardrails.
- Discount suggestion toggle and guardrail messaging in POS.
- Margin variance reporting (backend aggregates, CSV export, frontend table).

### Future opportunities (v1.1+)
- ESC/POS raw printing for thermal receipts.
- Purchase/stock-in workflow with supplier tracking.
- Localisation/multi-language packs.
- Optional cloud/off-site backups or integrations with cloud drives.

## 1) Product Objectives & Success Metrics

**Objectives**
- Make daily sales and stock tracking effortless without internet connectivity.
- Provide trustworthy, professional invoices (print/share PDF) within seconds.
- Offer simple summaries that help owners spot issues (top products, daily totals).

**Success Metrics (60 days post-launch)**
- Time to first bill ≤ 10 minutes after install (guided onboarding).
- ≥ 90% of sessions occur with no internet connection.
- ≥ 80% of customers export at least one CSV/PDF.
- Crash-free sessions ≥ 99.5%.
- Average bill creation time ≤ 25 seconds (POS open → print/share).

## 2) Feature Scope

### 2.1 Implemented (2025-10-25 build)

**Products & Stock**
- Product CRUD with name, SKU/barcode, category, unit price, tax %, quantity, reorder level, notes.
- CSV import/export with strict header validation and error reporting.
- Manual stock adjustments logged via stock movements; low-stock count surfaced in the UI shell.

**Point of Sale (POS)**
- Inventory search (name/SKU), add-to-cart, quantity adjustments, per-line discount entry.
- Order-level discount support, automatic tax calculation, and sale total breakdown.
- Payment method capture (Cash, Card, Wallet/UPI) and printable/PDF invoice output via Wails bridge.
- Stock decremented per sale, with generated sale number based on timestamp.

**Sales History**
- List view with filtering (date, payment method, status) and per-sale detail modal.
- Refund (restores stock and marks sale “Refunded”) and Void actions available from Sales history (owner PIN enforcement still pending).
- Reprint invoices through the invoice dialog.

**Reports**
- Daily summary metrics (total sales, invoice count, average ticket, tax collected).
- Top products leaderboard within a selected date range, including quantity and revenue.
- CSV exports for both daily summary and top products datasets.

**Settings & Onboarding**
- Shop profile (name, address, phone, tax ID, currency symbol, tax defaults, invoice footer).
- UI preferences (locale placeholder, dark mode toggle, telemetry toggle) persisted via settings service.
- Owner PIN creation, verification, and clearing; hashed with bcrypt.
- First-run onboarding wizard guiding profile setup and CSV import.

**Backups & Restore**
- Nightly and shutdown backups stored under `data/backups/` with retention policy (default 30 files).
- Manual backup/restore actions exposed through the UI; restores create a pre-restore snapshot automatically.
- Restore guide with CLI validation steps.

**UX Enhancements**
- Keyboard shortcuts for navigation (Alt+1..5) and dark mode (Alt+D).
- Responsive layout with Tailwind utilities; dark-mode aware styling.

### 2.2 Remaining for v1.0 GA
- Authentication & role management (admin/operator) with enforced navigation guards and session-aware Wails middleware.
- Team management (add/edit/deactivate users) in Settings.
- Product margin/max discount attributes with validation, CSV updates, and display in POS/product editor.
- Discount guardrail enforcement and optional suggested discount banner.
- Margin report (UI + CSV) highlighting products sold below target margins.
- Owner PIN prompts on sensitive flows (refund, void, restore) once authentication is in place.

### 2.3 Post-v1.0 / Stretch
- ESC/POS printing, purchase orders, localisation, optional cloud backup, customer loyalty features.

## 3) User Stories & Acceptance Criteria

### Implemented
- **Inventory Setup**  
  As an owner, I can add or import products so they appear in POS searches immediately.  
  *Acceptance:* CSV template validates required headers; successful import creates/updates products and reports issues per row; manual creation enforces non-negative pricing and quantities.

- **Billing**  
  As a cashier, I can search inventory, apply discounts, collect payment method, and produce a printable receipt.  
  *Acceptance:* Cart prevents negative quantities, calculates tax, refuses discounts that exceed line/order subtotal, and produces PDF invoice.

- **Refund/Void**  
  As an owner, I can refund or void a sale to correct mistakes and restore stock.  
  *Current Behaviour:* Refund/void sets sale status and replays stock movements. Owner PIN enforcement is not yet wired and is tracked in Outstanding work.

- **Reporting**  
  As an owner, I can review today’s sales and top products and export CSV snapshots.  
  *Acceptance:* Date filters update data live; CSV exports match on-screen metrics.

- **Backups**  
  As an owner, I can run or schedule database backups and restore when needed.  
  *Acceptance:* Backup files appear in `data/backups/`; restore replaces `app.sqlite` and logs a pre-restore snapshot.

- **Onboarding & Preferences**  
  As a new user, I am guided through shop profile setup and optional CSV import; I can toggle dark mode and telemetry later.  
  *Acceptance:* Wizard auto-launches when profile name is empty; dark-mode preference persists across sessions.

### Deferred
- **Authentication** *(Deferred)*  
  As an owner, I sign in with a seeded admin account and create operator accounts with limited permissions.  
  *Acceptance:* Login required before shell loads; operator role blocks Settings/backup routes.

- **Margin Guardrails & Suggestions** *(Deferred)*  
  As an owner, I configure margin and max discount per product, and the POS suggests safe discounts.  
  *Acceptance:* UI blocks overrides outside configured limits; suggestions respect guardrails and update live.

- **Margin Reporting** *(Deferred)*  
  As an owner, I review a margin variance report that flags products sold below target margins.  
  *Acceptance:* Report lists configured vs realised discount percentages and CSV export includes flag column.

## 4) Data Model (SQLite)

### 4.1 Tables (current schema)
```sql
-- products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_bp INTEGER NOT NULL DEFAULT 0,
  current_qty INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
);

-- sales (invoice header)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_no TEXT NOT NULL UNIQUE,
  ts INTEGER NOT NULL,
  customer_name TEXT,
  payment_method TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  note TEXT
);

-- sale_items (invoice lines)
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  tax_rate_bp INTEGER NOT NULL DEFAULT 0,
  line_subtotal_cents INTEGER NOT NULL,
  line_discount_cents INTEGER NOT NULL DEFAULT 0,
  line_tax_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

-- stock movements audit log
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  ts INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT
);

-- settings key/value store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- backup metadata
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
  size_bytes INTEGER NOT NULL
);
```

### 4.2 Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_ts ON sales(ts);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ts ON stock_movements(ts);
```

### 4.3 Notes
- Money stored as integer cents; tax stored as basis points (1% = 100 bp).
- `current_qty` is authoritative; `stock_movements` provides the audit trail.
- Owner PINs and preferences are persisted as JSON blobs inside the `settings` table.
- Users table is not yet present; authentication backlog work will introduce it.

## 5) CSV Contracts

### 5.1 Products Import & Export
Headers (strict order):  
`sku,name,category,unit_price,tax_rate_percent,current_qty,reorder_level,notes`

- `unit_price` and `tax_rate_percent` accept decimals; backend converts to cents/basis points.
- Non-negative numeric validation enforced; missing name/SKU reject the row.
- Export mirrors the same columns with formatted decimals to two decimal places.

### 5.2 Reports CSV
- Daily summary export: `date_iso,total_sales_cents,invoice_count,average_ticket_cents,tax_collected_cents`.
- Top products export: `product_id,product_name,quantity_sold,revenue_cents`.

## 6) Wails API Surface

All endpoints return `{ok:boolean, data?:T, error?:string}` envelopes.

- `app.App.HealthPing(message)` → sanity check response.
- `product.API.CreateProduct(ProductInput)` / `UpdateProduct` / `DeleteProduct` / `ListProducts` / `AdjustStock` / `ImportProductsCSV` / `ExportProductsCSV` / `LowStockCount`.
- `sale.API.CreateSale` / `ListSales` / `GetSale` / `RefundSale` / `VoidSale`.
- `report.API.DailySummary(dateISO)` / `TopProducts(fromISO, toISO, limit)` / `DailySummaryCSV` / `TopProductsCSV`.
- `settings.API.Profile` / `SaveProfile` / `Preferences` / `SavePreferences` / `SetOwnerPIN` / `VerifyOwnerPIN` / `ClearOwnerPIN` / `HasOwnerPIN`.
- `backup.API.Create` / `List(limit)` / `Restore(filename)` / `SetRetention(days)`.
- `invoice.API.GenerateHTML(saleID)` / `GeneratePDF(saleID)`.

## 7) UX Flows

### 7.1 First Run
1. Launch app → onboarding wizard prompts for shop name, address, currency, default tax.
2. Optional CSV import allows bulk product load.
3. Landing on Dashboard shows zero inventory state and prompts to add products.

### 7.2 Daily Operation
1. Cashier opens POS, scans/searches products, adjusts quantities/discounts.
2. On submit, POS displays invoice dialog with HTML preview and PDF download button.
3. Owner can access Reports for daily snapshot and top products; exports CSV when needed.
4. Backup scheduler runs automatically; owner can trigger manual backup before closing.

### 7.3 Refund/Void Flow
1. Owner navigates to Sales history, opens sale detail, selects Refund or Void.
2. The action currently executes immediately; wiring owner PIN prompts is tracked as outstanding work.
3. History table updates status; invoice dialog reflects new status.

## 8) Operational Notes

- Default data path: `data/app.sqlite`, backups in `data/backups/`.
- `make dev` runs Wails dev server; `make build` creates release binaries.
- Restore guide (`docs/restore-guide.md`) outlines CLI validation after restore.
- Environment variables: `SHOPMATE_DB_PATH`, `SHOPMATE_ENV` (`development` enables verbose logging), `SHOPMATE_LOCALE`, `SHOPMATE_ENABLE_TELEMETRY`.

## 9) Release Packaging Checklist

1. `npm ci && npm run build` (frontend assets).  
2. `wails build -clean` per target (`GOOS`/`GOARCH`).  
3. Collect binaries from `build/bin/<target>/`.  
4. Code-sign per platform (Authenticode / macOS codesign) if certificates are available.  
5. Zip installers with semantic version naming (`ShopMate-v1.0.0-win64.zip`, etc.) and generate SHA256 checksums.  
6. Smoke test each package: run POS sale, refund, CSV exports, verify backup folder creation.

## 10) Open Questions & Risks

- Authentication work introduces schema changes and new Wails APIs—ensure migration strategy for existing deployments.
- Margin guardrails will expand CSV contracts; communicate column changes to existing operators.
- Consider storage quotas/retention for backups on low-disk devices.
- Monitor performance when product catalog >5k items; consider pagination if required.
