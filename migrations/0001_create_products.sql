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
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TRIGGER IF NOT EXISTS trg_products_touch_updated_at
AFTER UPDATE ON products
FOR EACH ROW
WHEN NEW.updated_at <= OLD.updated_at
BEGIN
    UPDATE products
    SET updated_at = (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    WHERE id = NEW.id;
END;
