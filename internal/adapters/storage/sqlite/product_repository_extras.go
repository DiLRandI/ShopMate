package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"shopmate/internal/domain/product"
)

// Update mutates an existing product by id.
func (r *ProductRepository) Update(ctx context.Context, id int64, input product.UpdateInput) (*product.Product, error) {
	if id <= 0 {
		return nil, errors.New("id must be > 0")
	}
	if err := input.Validate(); err != nil {
		return nil, err
	}

	_, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET name = ?, category = ?, unit_price_cents = ?, tax_rate_bp = ?, reorder_level = ?, notes = ?
		WHERE id = ?`,
		input.Name,
		input.Category,
		input.UnitPriceCents,
		input.TaxRateBasisPoints,
		input.ReorderLevel,
		input.Notes,
		id,
	)
	if err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}

	return r.getByID(ctx, id)
}

// Delete removes a product by id.
func (r *ProductRepository) Delete(ctx context.Context, id int64) error {
	if id <= 0 {
		return errors.New("id must be > 0")
	}
	_, err := r.db.ExecContext(ctx, `DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

// AdjustStock applies a manual delta to the product quantity and records a stock movement.
func (r *ProductRepository) AdjustStock(ctx context.Context, input product.AdjustmentInput) (*product.Product, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin adjustment tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var (
		currentQty int64
		sku        string
	)
	if err = tx.QueryRowContext(ctx, `SELECT current_qty, sku FROM products WHERE id = ?`, input.ProductID).
		Scan(&currentQty, &sku); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("product not found: %w", err)
		}
		return nil, fmt.Errorf("load product qty: %w", err)
	}

	newQty := currentQty + input.Delta
	if newQty < 0 {
		return nil, fmt.Errorf("insufficient stock for adjustment; current=%d delta=%d", currentQty, input.Delta)
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE products
		SET current_qty = ?, updated_at = (CAST(strftime('%s','now') AS INTEGER) * 1000)
		WHERE id = ?`,
		newQty,
		input.ProductID,
	); err != nil {
		return nil, fmt.Errorf("update product qty: %w", err)
	}

	if _, err = tx.ExecContext(ctx, `
		INSERT INTO stock_movements (product_id, ts, delta, reason, ref)
		VALUES (?, (CAST(strftime('%s','now') AS INTEGER) * 1000), ?, ?, ?)`,
		input.ProductID,
		input.Delta,
		input.Reason,
		sqlNullIfEmpty(input.Ref),
	); err != nil {
		return nil, fmt.Errorf("insert stock movement: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit adjustment: %w", err)
	}

	return r.getByID(ctx, input.ProductID)
}

// Upsert creates or updates a product by SKU, returning whether a new record was created.
func (r *ProductRepository) Upsert(ctx context.Context, input product.CreateInput) (*product.Product, bool, error) {
	if err := input.Validate(); err != nil {
		return nil, false, err
	}

	if product, err := r.Create(ctx, input); err == nil {
		return product, true, nil
	} else if !isUniqueConstraint(err) {
		return nil, false, err
	}

	_, err := r.db.ExecContext(ctx, `
		UPDATE products
		SET name = ?, category = ?, unit_price_cents = ?, tax_rate_bp = ?, current_qty = ?, reorder_level = ?, notes = ?
		WHERE sku = ?`,
		input.Name,
		input.Category,
		input.UnitPriceCents,
		input.TaxRateBasisPoints,
		input.CurrentQty,
		input.ReorderLevel,
		input.Notes,
		input.SKU,
	)
	if err != nil {
		return nil, false, fmt.Errorf("upsert product: %w", err)
	}

	product, err := r.getBySKU(ctx, input.SKU)
	if err != nil {
		return nil, false, fmt.Errorf("load upserted product: %w", err)
	}
	return product, false, nil
}

// CountLowStock returns number of products below or at reorder level.
func (r *ProductRepository) CountLowStock(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM products
		WHERE reorder_level > 0 AND current_qty <= reorder_level`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count low stock: %w", err)
	}
	return count, nil
}

func (r *ProductRepository) getBySKU(ctx context.Context, sku string) (*product.Product, error) {
	var p product.Product
	err := r.db.QueryRowContext(ctx, `
		SELECT id, sku, name, category, unit_price_cents, tax_rate_bp, current_qty, reorder_level, notes
		FROM products
		WHERE sku = ?`, sku).Scan(
		&p.ID,
		&p.SKU,
		&p.Name,
		&p.Category,
		&p.UnitPriceCents,
		&p.TaxRateBasisPoints,
		&p.CurrentQty,
		&p.ReorderLevel,
		&p.Notes,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func isUniqueConstraint(err error) bool {
	if err == nil {
		return false
	}
	return stringsContainsIgnoreCase(err.Error(), "unique constraint failed: products.sku")
}

func stringsContainsIgnoreCase(str, substr string) bool {
	if len(str) == 0 || len(substr) == 0 {
		return false
	}
	return strings.Contains(strings.ToLower(str), strings.ToLower(substr))
}

func sqlNullIfEmpty(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
