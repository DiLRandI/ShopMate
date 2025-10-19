ShopMate — Product Requirements Document (PRD)

A single-binary Wails (Go + React) desktop app for small shops: inventory, billing, and simple insights.

0) Overview

Goal
Deliver a fast, offline-first desktop application that small retailers can install and use immediately (no separate database). The app tracks products and stock, generates bills, and provides basic business summaries. It runs as a single binary using Wails (Go backend + React frontend) with SQLite for storage and CSV/PDF for data portability.

Primary Users

Shop owner (admin)

Cashier (limited role; optional in v1.1)

Platforms
Windows 10/11, macOS (Intel/ARM), Linux (Ubuntu LTS).

Non-Goals (v1.0)

Cloud sync / multi-device live concurrency

Advanced accounting (ledgers, P&L)

Vendor purchase orders and GRNs

Complex taxation rules beyond flat/item tax rates

1) Product Objectives & Success Metrics

Objectives

Make daily sales and stock tracking effortless without internet.

Provide trustworthy billing (print/share) that looks professional.

Offer simple, actionable summaries (daily/weekly/monthly).

Success Metrics (60 days post-launch)

Time to first bill ≤ 10 minutes after install (guided onboarding).

≥ 90% of sessions occur with no internet connection.

≥ 80% of users export at least one CSV/PDF.

Crash-free sessions ≥ 99.5%.

Average bill creation time (from POS screen open to print/share) ≤ 25 seconds.

2) Feature Scope
2.1 MVP Features (v1.0)

Products & Stock

Create/edit products: name, sku/barcode, category, unit price, tax rate, current qty, reorder level, notes.

Bulk import from CSV; bulk export to CSV.

Low-stock indicator on list + badge on sidebar.

Quick Sale / Billing (POS)

Add line items by scan/sku/name search; set qty, discount (per line/overall).

Auto tax calculation; sub-total, discount, tax, total.

Payment methods: Cash, Card, Wallet/UPI (free text).

Generate Invoice (HTML → system print dialog) and PDF export.

Auto-decrement stock on successful sale.

Sales History

List of invoices with filters (date range, payment method, customer).

View/print/share previous invoices.

Refund/void (full invoice) with stock restoration (protected action).

Reports (Basic)

Daily Summary: total sales, #invoices, avg ticket, tax collected.

Top Products (date range): qty & revenue.

Export report CSVs.

Settings

Shop profile: name, address, phone, tax id (optional), logo.

Invoice template options (logo on/off, footer message, terms).

Data/backup: backup folder, automatic daily backups on app exit or midnight.

Tax mode: per-item tax % (simple).

Data Portability

CSV export: products, sales, sale items, stock movements.

PDF export for invoices.

Offline-First & Safety

Single file DB (SQLite) with WAL mode.

Auto backups with retention.

Basic role protection (owner PIN for destructive operations).

2.2 Near-Term (v1.1+)

User roles: Owner, Cashier (RBAC).

Barcode scanner support (keyboard wedge first).

Purchase/stock-in workflow (simple).

ESC/POS raw printing (faster thermal printing).

Localization (multi-language packs).

Optional cloud backup (manual export to Google Drive/OneDrive folder).

3) User Stories & Acceptance Criteria
3.1 Products

As an owner, I can add a product with name, price, tax, and quantity so I can sell it immediately.

Acceptance: Required fields validated; product appears in POS search; stock listed correctly.

As an owner, I can import a CSV of products to save time.

Acceptance: Sample CSV template provided; import shows a preview & validation errors; creates/updates products.

3.2 Billing

As a cashier, I can quickly search items and generate a bill.

Acceptance: Search returns results <200ms on 5k products; bill shows totals and taxes; printing/sharing works.

As a cashier, I can apply an order-level discount (amount or %).

Acceptance: Totals recalc accurately; discount reflected in invoice and saved in DB.

3.3 Sales History

As an owner, I can reprint a previous invoice and issue a refund.

Acceptance: Refund restores stock; invoice status shows “Refunded”; protected by owner PIN.

3.4 Reports

As an owner, I can view today’s sales and top products.

Acceptance: Stats align with sales table; exporting CSV matches UI values (± rounding).

3.5 Settings/Backups

As an owner, I can set my shop details and logo for invoices.

Acceptance: Preview invoice shows logo and details; PDFs and prints match preview.

As an owner, I get daily backups automatically.

Acceptance: Backup files (.sqlite timestamped) appear in backup folder; last 30 kept.

4) Information Architecture & Navigation

Sidebar

Dashboard

POS (New Sale)

Products

Sales

Reports

Settings

Top Bar

Quick actions: New Sale, Search, Export.

Date filters on Sales/Reports pages.

Status chip: “Offline”, “Backup OK”, “Low Stock: N”.

5) Data Model (SQLite)
5.1 Tables (DDL)
-- products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_bp INTEGER NOT NULL DEFAULT 0, -- basis points, e.g., 500 = 5.00%
  current_qty INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL, -- unix ms
  updated_at INTEGER NOT NULL
);

-- sales (invoice header)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_no TEXT UNIQUE NOT NULL, -- human-friendly invoice number
  ts INTEGER NOT NULL,          -- unix ms
  customer_name TEXT,
  payment_method TEXT,          -- Cash/Card/UPI/Other
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed', -- Completed, Refunded, Voided
  note TEXT
);

-- sale_items (invoice lines)
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  tax_rate_bp INTEGER NOT NULL,
  line_subtotal_cents INTEGER NOT NULL,
  line_discount_cents INTEGER NOT NULL DEFAULT 0,
  line_tax_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

-- stock movements (audit)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  ts INTEGER NOT NULL,
  delta INTEGER NOT NULL,         -- negative for sale, positive for restock
  reason TEXT NOT NULL,           -- Sale, Refund, ManualAdjust, Import, Init
  ref TEXT                         -- sale_no or note
);

-- settings (kv)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_ts ON sales(ts);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stockmovements_product_id ON stock_movements(product_id);


Notes

Money stored as integer cents to avoid float issues.

Tax stored as basis points (bp) for precision.

current_qty is authoritative; stock_movements is the ledger.

5.2 Derived Views (optional)
CREATE VIEW IF NOT EXISTS v_daily_summary AS
SELECT
  date(ts/1000, 'unixepoch', 'localtime') AS d,
  COUNT(*) AS invoices,
  SUM(total_cents) AS revenue_cents,
  SUM(tax_cents) AS tax_cents,
  AVG(total_cents) AS avg_ticket_cents
FROM sales
WHERE status='Completed'
GROUP BY d;

6) CSV Contracts
6.1 Products Import CSV (UTF-8)

Headers (exact order):

sku,name,category,unit_price, tax_rate_percent, current_qty, reorder_level, notes


unit_price is decimal string like 199.99

tax_rate_percent like 5 or 5.5

Validation

name required; unit_price ≥ 0; current_qty integer.

6.2 Products Export CSV

Same columns, plus created_at,updated_at (ISO 8601).

6.3 Sales Export CSV
sale_no,ts_iso,customer_name,payment_method,subtotal,tax,discount,total,status

6.4 Sale Items Export CSV
sale_no,sku,product_name,qty,unit_price,line_discount,line_tax,line_total

6.5 Stock Movements Export CSV
ts_iso,sku,product_name,delta,reason,ref

7) Invoice Spec

Layout

Header: Shop logo/name, address, phone, tax id (optional), invoice number, date/time.

Body: Table (Item, Qty, Rate, Disc, Tax, Amount).

Summary: Subtotal, Discount, Tax, Grand Total.

Footer: “Thank you” note + configurable message (e.g., return policy).

Formats

A4 and 80mm thermal templates (HTML/CSS).

Share as PDF; print via system dialog (v1.0).

ESC/POS (raw) to be added in v1.1.

Numbering

Running sale_no like SRB-2025-000001. Reset annually or continuous (setting).

8) UX Flows (Happy Paths)
8.1 First Run (Onboarding)

Set shop profile (name, address, logo).

Choose currency symbol and default tax rate.

Optional: Import products CSV (with preview).

Land on POS with a “Create first sale” tip.

8.2 Create Sale

POS screen → search/scan → add items → adjust qty/discount → choose payment → Save & Print → success toast → stock decremented.

8.3 Refund Invoice

Sales → open invoice → “Refund” → confirm (owner PIN) → stock restored → status updates → printable refund note.

8.4 Backup

On exit or midnight: copy app.db to backups/app-YYYYMMDD.sqlite (keep last 30); show brief notification.

9) Non-Functional Requirements

Performance

Product search ≤ 200ms for 10k SKUs.

POS screen render ≤ 250ms initial load.

Export 30-day sales CSV ≤ 5s with 5k invoices.

Reliability

SQLite with WAL mode; safe writes.

Automatic DB integrity check weekly.

Security

Local only by default; no open ports (Wails WebView).

Owner PIN for refunds/voids, backup restore, and settings.

Privacy

No data leaves device unless exported by user.

Accessibility

Keyboard navigation, high-contrast theme toggle, large font option.

Localization

i18n framework in UI; JSON message catalogs. (English default; structure-ready for other languages.)

10) Technology & Architecture

Frontend

React + TypeScript + Vite

State: Zustand or Redux Toolkit (simple slices: products, cart, settings)

UI: headless primitives or a small component library; responsive but desktop-first

Printing: HTML → native print dialog; PDF via browser print to PDF

Backend (Go with Wails)

Storage: SQLite (modernc.org/sqlite for pure-Go)

Migrations: goose or golang-migrate (embedded SQL)

Query layer: sqlc (type-safe) or standard database/sql helpers

Files: go:embed for UI assets (Wails packs this)

App Data Paths (per OS)

Windows: %AppData%\SmartRetailBuddy\

macOS: ~/Library/Application Support/SmartRetailBuddy/

Linux: ~/.local/share/SmartRetailBuddy/

Files: app.sqlite, /backups, /exports, /invoices

Build/Packaging

Wails build targets for Win/macOS/Linux; per-OS single binary (per arch).

Code-signing recommended (Win Authenticode, macOS Developer ID).

11) Wails API Surface (Go <-> JS Bridge)

Expose minimal, purpose-built methods. All return {ok:boolean, data?:T, error?:string}.

Products

ProductList(query?:string, page?:number, pageSize?:number)

ProductGet(id:int)

ProductCreate(p:ProductInput)

ProductUpdate(id:int, p:ProductInput)

ProductAdjustStock(id:int, delta:int, reason:string) // creates stock_movement

ProductImportCSV(path:string)

ProductExportCSV(path:string)

Sales

SaleCreate(d:SaleDraft) → returns sale_no

SaleGetByNo(saleNo:string)

SaleList(filter:SaleFilter) // date range, method, status

SaleRefund(saleNo:string, ownerPin:string)

SaleExportCSV(path:string)

SaleItemsExportCSV(path:string)

Reports

ReportDaily(date:string) // YYYY-MM-DD

ReportRangeSummary(from:string, to:string) // totals, top N

ReportExportCSV(type:string, from:string, to:string, path:string)

Settings/Backup

SettingsGetAll() / SettingsSet(k:string, v:string)

RunBackupNow()

RestoreFromBackup(path:string) (owner PIN)

GetAppPaths() // returns data, backup, exports dirs

Types (examples)

type ProductInput = {
  sku?: string;
  name: string;
  category?: string;
  unitPrice: number;        // decimal string in UI; convert to cents in Go
  taxRatePercent?: number;  // decimal string; store as bp
  currentQty?: number;
  reorderLevel?: number;
  notes?: string;
};

type SaleDraft = {
  lines: Array<{
    productId: number;
    qty: number;
    unitPrice?: number;      // optional override (promo)
    lineDiscount?: number;   // absolute
  }>;
  orderDiscount?: number;    // absolute
  paymentMethod: string;     // Cash/Card/UPI/Other
  customerName?: string;
  note?: string;
};


Error Conventions

Validation errors: error:"VALIDATION: <msg>"

Conflicts: error:"CONFLICT: <msg>"

Not found: error:"NOT_FOUND: <msg>"

System: error:"SYSTEM: <msg>"

12) UI Screens (React)
12.1 POS

Left: Search bar (SKU/Name), results list, quick add.

Right (Cart): Lines (Item, Qty ±, Price, Disc), Subtotal, Discount, Tax, Total, Payment method select, “Save & Print”.

Shortcuts: Ctrl+F search, +/- qty, Ctrl+S save & print.

12.2 Products

Table: SKU, Name, Category, Price, Qty, Reorder.

Actions: New, Import CSV, Export CSV, Adjust Stock.

Inline low-stock badges; filter by category.

12.3 Sales

Table: Date/Time, Invoice #, Customer, Total, Status, Method.

View/Print, Refund (owner PIN), Export CSV.

12.4 Reports

Tiles: Today’s revenue, invoices, avg ticket, tax.

Top products chart (bar, client-side).

Date range selector; export CSV.

12.5 Settings

Shop Profile, Invoice Template (preview), Data & Backup (paths, backup now), Security (owner PIN).

13) Calculations

Per Line

line_subtotal = qty * unit_price
line_total_before_tax = line_subtotal - line_discount
line_tax = round(line_total_before_tax * tax_rate_percent/100)
line_total = line_total_before_tax + line_tax


Invoice

subtotal = sum(line_subtotals)
order_discount applies after subtotal (before tax) OR proportionally per line (setting)
tax = sum(line_tax)  // if tax % per line
total = subtotal - order_discount + tax


Rounding

Use bankers’ rounding at currency cent precision.

14) Backup & Recovery

WAL mode by default; checkpoint on clean exit.

Daily backup to /backups folder (app-YYYYMMDD.sqlite), retain last 30.

Manual “Backup Now” button.

“Restore from backup” replaces current DB (owner PIN + confirm).

Pre-restore: auto copy current DB to /backups/app-pre-restore-<timestamp>.sqlite.

15) Logging & Telemetry (local)

Local rotating logs (info/warn/error) for troubleshooting.

No external telemetry in v1.0.

“Export logs” button in Settings.

16) Testing Strategy

Unit Tests (Go)

Pricing/tax math; sale create/refund modifies stock correctly.

CSV import validation; migrations up/down.

Integration Tests

Create 100 products, 1000 sales; performance thresholds.

Crash-safe writes (simulate abrupt termination during sale save).

UI Tests

POS happy path: add items → save → print dialog invoked.

CSV import preview validation errors rendered.

Acceptance Checklist

 Install → first sale ≤ 10 minutes

 Product search ≤ 200ms with 10k SKUs

 Create sale → stock decreased; refund → stock restored

 Daily backup created; retention honored

 CSV/PDF exports match UI values

 Owner PIN gates refunds/settings/restore

17) Risks & Mitigations

Power loss during write → WAL + transactions; periodic checkpoint.

Antivirus false positives (Windows) → code signing; reputation building.

Thermal printer compatibility → v1.0 via system print (universal); v1.1 ESC/POS.

18) Roadmap

v1.0 (MVP)

Products, POS, Sales history, Reports (basic), CSV/PDF, Backups, Owner PIN.

v1.1

ESC/POS raw printing, Barcode scanning, Roles (Cashier), Purchase/Stock-In, i18n packs.

v1.2

Optional cloud backup/sync, Customer ledger light, Promotions (price rules).

19) Developer Notes (Scaffolding & Conventions)

Folder Structure

/app
  /backend        # Go (Wails) - handlers, db, migrations
    /db
      /migrations
    /handlers
    /models
    /services
  /frontend       # React (Vite, TS)
    /src
      /components
      /pages
      /state
      /api        # TS wrappers for Wails calls
      /themes
  /assets         # invoice templates, logo placeholder


SQLite Open (Go)

DSN: file:app.sqlite?_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL).

db.SetMaxOpenConns(1) to avoid writer contention.

Migrations

Embed SQL files; run on startup idempotently.

Invoice Rendering

HTML template + data → open print dialog.

PDF: rely on system “Print to PDF”; optionally include headless renderer later.

Validation

UI + server-side; never trust client only.

20) Sample Pseudo API (Go)
type App struct {
  db *sql.DB
  pinHasher Hasher
}

func (a *App) SaleCreate(d SaleDraft) (Resp, error) {
  // validate lines, prices, qty > 0
  // begin tx
  // insert sales, sale_items
  // decrement stock (check not negative -> fail tx)
  // insert stock_movements
  // commit
  // return sale_no
}

func (a *App) SaleRefund(saleNo, pin string) (Resp, error) {
  // verify owner PIN
  // begin tx: mark sale Refunded, increment stock via stock_movements
  // commit
}

21) Accessibility & Internationalization Hooks

All text via i18n keys.

Font size setting (Normal/Large).

Keyboard shortcuts documented on POS.

Avoid color-only indicators (low stock uses icon+text).

22) Deliverables (for Build Agent)

Wails project with:

Embedded migrations

Go handlers per Section 11

React pages per Section 12

Invoice HTML templates (A4 + 80mm)

CSV schemas & import validator

Backup scheduler & retention

Owner PIN setup & secure storage (hashed with salt)

CI: build matrix for Win/macOS/Linux; artifacts zipped.