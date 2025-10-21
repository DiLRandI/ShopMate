ShopMate — Product Requirements Document (PRD)

A single-binary Wails (Go + React) desktop app for small shops: inventory, billing, and simple insights.

0) Overview

Goal
Deliver a fast, offline-first desktop application that small retailers can install and use immediately (no separate database). The app tracks products and stock, generates bills, and provides basic business summaries. It runs as a single binary using Wails (Go backend + React frontend) with SQLite for storage and CSV/PDF for data portability.

Primary Users

- Shop owner / Super Admin (full access, can manage users)
- Store staff POS operator (limited to billing and receipt printing)

Platforms
Windows 10/11, macOS (Intel/ARM), Linux (Ubuntu LTS).

Non-Goals (v1.0)

Cloud sync / multi-device live concurrency

Advanced accounting (ledgers, P&L)

Vendor purchase orders and GRNs

Complex taxation rules beyond flat/item tax rates
External compliance certifications (PCI DSS, SOC 2) for auth in v1.0

## Status Update (2025-10-21)

- ✅ Inventory management supports full CRUD operations, CSV import/export, and manual stock adjustments.
- ✅ POS flow issues invoices with HTML/PDF output, wraps all bridge calls in `{ok,data,error}` envelopes, and reflects real-time stock changes.
- ✅ Sales history, reporting dashboards, and backup scheduling (midnight + on exit) are implemented end-to-end.
- ✅ Settings screens persist shop profile, localization preferences, and owner PIN (hashed) with verification helpers.
- ✅ Dark theme toggle, keyboard shortcuts (Alt+1..5, Alt+D), onboarding wizard, and low-stock status chip shipped across the desktop shell.
- 🚧 Username/password authentication with role management scoped for the next Settings update (default admin seeded locally, POS-only role in progress).
- 🆕 Product-level margin & maximum discount guardrails, POS discount suggestion toggle, and margin reporting drafted for implementation alignment (docs updated 2025-10-21).

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

Create/edit products: name, sku/barcode, category, unit price, tax rate, current qty, reorder level, margin %, maximum discount %, notes.

Bulk import from CSV; bulk export to CSV (including margin and max discount).

Low-stock indicator on list + badge on sidebar.

Quick Sale / Billing (POS)

Add line items by scan/sku/name search; set qty, discount (per line/overall).

Auto tax calculation; sub-total, discount, tax, total.

Payment methods: Cash, Card, Wallet/UPI (free text).

Generate Invoice (HTML → system print dialog) and PDF export.

Auto-decrement stock on successful sale.

Suggested discount callout (optional, controlled by shop-level toggle) that honors per-product maximums and margins.

Sales History

List of invoices with filters (date range, payment method, customer).

View/print/share previous invoices.

Refund/void (full invoice) with stock restoration (protected action).

Reports (Basic)

Daily Summary: total sales, #invoices, avg ticket, tax collected.

Top Products (date range): qty & revenue.

Product Margin Report: margin %, max discount %, realized discount, variance alerts.

Export report CSVs.

Settings

Shop profile: name, address, phone, tax id (optional), logo.

Invoice template options (logo on/off, footer message, terms).

Data/backup: backup folder, automatic daily backups on app exit or midnight.

Tax mode: per-item tax % (simple).

Authentication & User Management

Username + password login required before accessing the shell; credentials stored in the local SQLite database with hashed passwords.

Seed a default super admin account (`admin` / `admin`) on first run; prompt the user to change the password after initial login and track whether the default is still active.

Super admins can create, edit, and deactivate user accounts with roles `ADMIN` (full access) or `OPERATOR` (POS + bill printing only).

Operators can access POS and invoice history but are blocked from Settings, backups, product imports, and reports.

Acceptance: login blocks unauthorized access; default admin cannot be deleted; password change banner persists until resolved; role restrictions enforced across backend and UI navigation.

Data Portability

CSV export: products, sales, sale items, stock movements.

PDF export for invoices.

Offline-First & Safety

Single file DB (SQLite) with WAL mode.

Auto backups with retention.

Basic role protection (owner PIN for destructive operations).

2.2 Near-Term (v1.1+)

Enhanced authentication: MFA, login audit trails, and session timeouts.

Barcode scanner support (keyboard wedge first).

Purchase/stock-in workflow (simple).

ESC/POS raw printing (faster thermal printing).

Localization (multi-language packs).

Optional cloud backup (manual export to Google Drive/OneDrive folder).

3) User Stories & Acceptance Criteria
3.1 Products

As an owner, I can add a product with name, price, tax, and quantity so I can sell it immediately.

Acceptance: Required fields validated; product appears in POS search; stock listed correctly.

As an owner, I can set each product’s margin % and maximum discount % so profitability rules flow through POS and reports.

Acceptance: Margin/max discount inputs default from CSV/import values, enforce 0–100%, and block saving when max discount exceeds margin.

As an owner, I can import a CSV of products to save time.

Acceptance: Sample CSV template provided; import shows a preview & validation errors; creates/updates products.

3.2 Billing

As a cashier, I can quickly search items and generate a bill.

Acceptance: Search returns results <200ms on 5k products; bill shows totals and taxes; printing/sharing works.

As a cashier, I can apply an order-level discount (amount or %).

Acceptance: Totals recalc accurately; discount reflected in invoice and saved in DB.

As a cashier, I see a suggested overall discount based on products in the cart when the shop owner enables it.

Acceptance: Suggestion respects each product’s max discount and margin, updates live as the cart changes, and never recommends values outside allowed ranges.

3.3 Sales History

As an owner, I can reprint a previous invoice and issue a refund.

Acceptance: Refund restores stock; invoice status shows “Refunded”; protected by owner PIN.

3.4 Reports

As an owner, I can view today’s sales and top products.

Acceptance: Stats align with sales table; exporting CSV matches UI values (± rounding).

As an owner, I can review a margin report that highlights products sold below target margins.

Acceptance: Report lists margin %, max discount %, realized discount %, and flags rows where realized discount exceeds max discount or margin.

3.5 Settings/Backups

As an owner, I can set my shop details and logo for invoices.

Acceptance: Preview invoice shows logo and details; PDFs and prints match preview.

As an owner, I get daily backups automatically.

Acceptance: Backup files (.sqlite timestamped) appear in backup folder; last 30 kept.

As an owner, I can toggle POS discount suggestions so staff only see them when aligned with store policy.

Acceptance: Setting appears under POS preferences, persists locally, and immediately hides/shows suggestions without app restart.

3.6 Authentication & User Management

As an owner, I can sign in with the default admin credentials on first launch so I can finish setup quickly.

Acceptance: `admin` / `admin` works only until the password is changed; the app prompts for the change immediately after login.

As an owner, I can change my password and create additional users with passwords and roles so I can delegate POS work safely.

Acceptance: creating a user requires unique username, role selection (`ADMIN` or `OPERATOR`), and an initial password; edits log `updated_at` and roles update instantly.

As an operator, I can log in and use the POS and invoice printing screens without seeing admin settings.

Acceptance: navigation hides admin-only routes; direct URL access returns an authorization error.

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
-- users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','OPERATOR')),
  requires_password_reset INTEGER NOT NULL DEFAULT 0,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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
  margin_bp INTEGER NOT NULL DEFAULT 0 CHECK(margin_bp BETWEEN 0 AND 10000),
  max_discount_bp INTEGER NOT NULL DEFAULT 0 CHECK(max_discount_bp BETWEEN 0 AND 10000 AND max_discount_bp <= margin_bp),
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
  effective_discount_bp INTEGER NOT NULL DEFAULT 0 CHECK(effective_discount_bp BETWEEN 0 AND 10000),
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

Margin and max discount stored as basis points (0–10000) to align with tax precision.

sale_items.effective_discount_bp captures per-line discount after allocating order-level discounts.

current_qty is authoritative; stock_movements is the ledger.

Users table stores Argon2/Bcrypt password hashes; `requires_password_reset` stays `1` until the default admin password changes.

Settings store POS feature toggles such as `pos.enable_discount_suggestions` (string `"true"` / `"false"`).

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

CREATE VIEW IF NOT EXISTS v_product_margin_report AS
SELECT
  si.product_id,
  p.sku,
  p.name,
  SUM(si.qty) AS units_sold,
  p.margin_bp,
  p.max_discount_bp,
  AVG(si.effective_discount_bp) AS avg_discount_bp,
  p.margin_bp - AVG(si.effective_discount_bp) AS realized_margin_bp
FROM sale_items si
JOIN sales s ON s.id = si.sale_id AND s.status = 'Completed'
JOIN products p ON p.id = si.product_id
GROUP BY si.product_id;

6) CSV Contracts
6.1 Products Import CSV (UTF-8)

Headers (exact order):

sku,name,category,unit_price,tax_rate_percent,current_qty,reorder_level,margin_percent,max_discount_percent,notes


unit_price is decimal string like 199.99

tax_rate_percent like 5 or 5.5

Validation

name required; unit_price ≥ 0; current_qty integer; margin/max discount 0–100; max discount ≤ margin.

6.2 Products Export CSV

Same columns (including margin_percent and max_discount_percent), plus created_at,updated_at (ISO 8601).

6.3 Sales Export CSV
sale_no,ts_iso,customer_name,payment_method,subtotal,tax,discount,total,status

6.4 Sale Items Export CSV
sale_no,sku,product_name,qty,unit_price,line_discount,line_tax,line_total

6.5 Stock Movements Export CSV
ts_iso,sku,product_name,delta,reason,ref

6.6 Margin Report CSV
sku,product_name,units_sold,margin_percent,max_discount_percent,average_discount_percent,realized_margin_percent,flag

flag indicates “OVER_DISCOUNT” when realized discounts exceed configured thresholds.

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

Keyboard navigation, dark theme toggle, large font option.

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

ProductMarginDefaults() // returns global defaults for margin/max discount thresholds

Sales

SaleCreate(d:SaleDraft) → returns sale_no

SaleGetByNo(saleNo:string)

SaleList(filter:SaleFilter) // date range, method, status

SaleRefund(saleNo:string, ownerPin:string)

SaleExportCSV(path:string)

SaleItemsExportCSV(path:string)

SaleSuggestDiscount(lines:[]CartLineInput) → returns {suggestedDiscountBp:int, capReason:string}

Reports

ReportDaily(date:string) // YYYY-MM-DD

ReportRangeSummary(from:string, to:string) // totals, top N

ReportProductMargins(from:string, to:string) // margin delta report

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
  marginPercent?: number;   // decimal string; store as bp
  maxDiscountPercent?: number; // decimal string; store as bp
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

type CartLineInput = {
  productId: number;
  qty: number;
  unitPriceCents: number;
  lineDiscountCents?: number;
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

Suggested discount banner: shows recommended % and rationale (e.g., “Tightest margin is 12% on SKU 123”), with tooltip linking to product settings; hidden when toggle off.

Shortcuts: Ctrl+F search, +/- qty, Ctrl+S save & print.

12.2 Products

Table: SKU, Name, Category, Price, Qty, Reorder, Margin %, Max Discount %.

Actions: New, Import CSV, Export CSV, Adjust Stock.

Inline low-stock badges; filter by category.

12.3 Sales

Table: Date/Time, Invoice #, Customer, Total, Status, Method.

View/Print, Refund (owner PIN), Export CSV.

12.4 Reports

Tiles: Today’s revenue, invoices, avg ticket, tax.

Top products chart (bar, client-side).

Margin report tab: table of SKU, units sold, margin %, max discount %, average discount %, flags; export CSV.

Date range selector; export CSV.

12.5 Settings

Shop Profile, Invoice Template (preview), Data & Backup (paths, backup now), Security (owner PIN), POS preferences (discount suggestion toggle & default margin guardrail).

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


Margin Guardrails (cents → bp conversions use integer math)

line_discount_bp = round((line_discount_cents * 10000) / max(line_subtotal_cents, 1))

order_discount_bp_per_line = round((order_discount_cents * 10000 * line_subtotal_cents) / max(subtotal_cents, 1))

effective_discount_bp = min(10000, line_discount_bp + order_discount_bp_per_line)

Constraints: effective_discount_bp ≤ max_discount_bp and max_discount_bp ≤ margin_bp. Violations return error:"VALIDATION: discount exceeds product guardrails".

Suggested order discount bp = min over cart lines of (min(margin_bp, max_discount_bp) - effective_discount_bp_current), clamped to ≥ 0; convert back to currency/percent for UI.

realized_margin_bp = max(0, margin_bp - effective_discount_bp); expose as percent in reports.


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

Margin/max discount validation (guardrail failures return VALIDATION errors).

ReportProductMargins aggregates units sold and realized discounts correctly.

Integration Tests

Create 100 products, 1000 sales; performance thresholds.

Crash-safe writes (simulate abrupt termination during sale save).

POS discount suggestion toggle on/off with mixed cart margins.

UI Tests

POS happy path: add items → save → print dialog invoked.

CSV import preview validation errors rendered.

Products form shows validation when margin < max discount; POS suggestion banner visible when toggle on.

Acceptance Checklist

 Install → first sale ≤ 10 minutes

 Product search ≤ 200ms with 10k SKUs

 Create sale → stock decreased; refund → stock restored

 Daily backup created; retention honored

 CSV/PDF exports match UI values

 Owner PIN gates refunds/settings/restore

 POS suggestion banner hidden when toggle off and never exceeds guardrails

 Margin report flags over-discount rows accurately

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
