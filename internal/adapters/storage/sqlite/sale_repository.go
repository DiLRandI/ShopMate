package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"shopmate/internal/domain/sale"
)

// SaleRepository handles persistence of sales and stock movements.
type SaleRepository struct {
	db *sql.DB
}

// NewSaleRepository constructs a new SaleRepository.
func NewSaleRepository(db *sql.DB) *SaleRepository {
	return &SaleRepository{db: db}
}

// Create persists a sale and decrements stock atomically.
func (r *SaleRepository) Create(ctx context.Context, draft sale.Sale) (*sale.Sale, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	ts := draft.Timestamp
	if ts.IsZero() {
		ts = time.Now()
	}
	tsMillis := ts.UnixMilli()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO sales (sale_no, ts, customer_name, payment_method, subtotal_cents, discount_cents, tax_cents, total_cents, status, note)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		draft.SaleNumber,
		tsMillis,
		nullIfEmpty(draft.CustomerName),
		draft.PaymentMethod,
		draft.SubtotalCents,
		draft.DiscountCents,
		draft.TaxCents,
		draft.TotalCents,
		draft.Status,
		nullIfEmpty(draft.Note),
	)
	if err != nil {
		return nil, fmt.Errorf("insert sale: %w", err)
	}

	saleID, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("sale last insert id: %w", err)
	}

	for _, line := range draft.Lines {
		if _, err = tx.ExecContext(ctx, `
			INSERT INTO sale_items (sale_id, product_id, qty, unit_price_cents, tax_rate_bp, line_subtotal_cents, line_discount_cents, line_tax_cents, line_total_cents)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			saleID,
			line.ProductID,
			line.Quantity,
			line.UnitPriceCents,
			line.TaxRateBasisPoints,
			line.LineSubtotalCents,
			line.LineDiscountCents,
			line.LineTaxCents,
			line.LineTotalCents,
		); err != nil {
			return nil, fmt.Errorf("insert sale line: %w", err)
		}

		result, errUpdate := tx.ExecContext(ctx, `
			UPDATE products
			SET current_qty = current_qty - ?
			WHERE id = ? AND current_qty >= ?`,
			line.Quantity,
			line.ProductID,
			line.Quantity,
		)
		if errUpdate != nil {
			return nil, fmt.Errorf("update stock: %w", errUpdate)
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			return nil, errors.New("insufficient stock")
		}

		if _, err = tx.ExecContext(ctx, `
			INSERT INTO stock_movements (product_id, ts, delta, reason, ref)
			VALUES (?, ?, ?, ?, ?)`,
			line.ProductID,
			tsMillis,
			-line.Quantity,
			"Sale",
			draft.SaleNumber,
		); err != nil {
			return nil, fmt.Errorf("insert stock movement: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit sale: %w", err)
	}

	draft.ID = saleID
	draft.Timestamp = time.UnixMilli(tsMillis).UTC()
	return &draft, nil
}

// Refund marks a sale as refunded and restores stock levels.
func (r *SaleRepository) Refund(ctx context.Context, saleID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin refund tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var (
		saleNo string
		status string
	)
	if err = tx.QueryRowContext(ctx, `SELECT sale_no, status FROM sales WHERE id = ?`, saleID).
		Scan(&saleNo, &status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("sale not found: %w", err)
		}
		return fmt.Errorf("load sale status: %w", err)
	}

	if status == "Refunded" {
		return nil
	}

	rows, err := tx.QueryContext(ctx, `SELECT product_id, qty FROM sale_items WHERE sale_id = ?`, saleID)
	if err != nil {
		return fmt.Errorf("load sale items: %w", err)
	}
	defer rows.Close()

	type movement struct {
		productID int64
		qty       int64
	}

	var movements []movement
	for rows.Next() {
		var m movement
		if err := rows.Scan(&m.productID, &m.qty); err != nil {
			return fmt.Errorf("scan sale item: %w", err)
		}
		movements = append(movements, m)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if _, err = tx.ExecContext(ctx, `UPDATE sales SET status = 'Refunded' WHERE id = ?`, saleID); err != nil {
		return fmt.Errorf("update sale status: %w", err)
	}

	nowMillis := time.Now().UnixMilli()

	for _, m := range movements {
		if _, err = tx.ExecContext(ctx, `
			UPDATE products
			SET current_qty = current_qty + ?
			WHERE id = ?`,
			m.qty, m.productID,
		); err != nil {
			return fmt.Errorf("restore stock: %w", err)
		}
		if _, err = tx.ExecContext(ctx, `
			INSERT INTO stock_movements (product_id, ts, delta, reason, ref)
			VALUES (?, ?, ?, ?, ?)`,
			m.productID,
			nowMillis,
			m.qty,
			"Refund",
			saleNo,
		); err != nil {
			return fmt.Errorf("insert stock reversal: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("refund commit: %w", err)
	}
	return nil
}

// List retrieves sales created within the date range.
func (r *SaleRepository) List(ctx context.Context, from, to time.Time) ([]sale.Sale, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, sale_no, ts, customer_name, payment_method, subtotal_cents, discount_cents, tax_cents, total_cents, status, note
		FROM sales
		WHERE ts BETWEEN ? AND ?
		ORDER BY ts DESC`,
		from.UnixMilli(),
		to.UnixMilli(),
	)
	if err != nil {
		return nil, fmt.Errorf("query sales: %w", err)
	}
	defer rows.Close()

	var salesResults []sale.Sale

	for rows.Next() {
		var rec sale.Sale
		var (
			tsMillis int64
			note     sql.NullString
			customer sql.NullString
		)
		if err := rows.Scan(
			&rec.ID,
			&rec.SaleNumber,
			&tsMillis,
			&customer,
			&rec.PaymentMethod,
			&rec.SubtotalCents,
			&rec.DiscountCents,
			&rec.TaxCents,
			&rec.TotalCents,
			&rec.Status,
			&note,
		); err != nil {
			return nil, fmt.Errorf("scan sale: %w", err)
		}
		rec.Timestamp = time.UnixMilli(tsMillis).UTC()
		if customer.Valid {
			rec.CustomerName = customer.String
		}
		if note.Valid {
			rec.Note = note.String
		}
		rec.Lines, err = r.loadLines(ctx, rec.ID)
		if err != nil {
			return nil, err
		}
		salesResults = append(salesResults, rec)
	}

	return salesResults, rows.Err()
}

func (r *SaleRepository) loadLines(ctx context.Context, saleID int64) ([]sale.Line, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT
			si.product_id,
			COALESCE(p.name, ''),
			COALESCE(p.sku, ''),
			si.qty,
			si.unit_price_cents,
			si.tax_rate_bp,
			si.line_subtotal_cents,
			si.line_discount_cents,
			si.line_tax_cents,
			si.line_total_cents
		FROM sale_items si
		LEFT JOIN products p ON p.id = si.product_id
		WHERE si.sale_id = ?
		ORDER BY si.id`,
		saleID,
	)
	if err != nil {
		return nil, fmt.Errorf("query sale lines: %w", err)
	}
	defer rows.Close()

	var lines []sale.Line
	for rows.Next() {
		var line sale.Line
		if err := rows.Scan(
			&line.ProductID,
			&line.ProductName,
			&line.SKU,
			&line.Quantity,
			&line.UnitPriceCents,
			&line.TaxRateBasisPoints,
			&line.LineSubtotalCents,
			&line.LineDiscountCents,
			&line.LineTaxCents,
			&line.LineTotalCents,
		); err != nil {
			return nil, fmt.Errorf("scan sale line: %w", err)
		}
		lines = append(lines, line)
	}
	return lines, rows.Err()
}

func nullIfEmpty(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}
