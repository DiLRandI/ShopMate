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

	res, err := tx.ExecContext(ctx, `INSERT INTO sales (sale_number, customer_name, subtotal_cents, discount_cents, tax_cents, total_cents, payment_method, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		draft.SaleNumber,
		draft.CustomerName,
		draft.SubtotalCents,
		draft.DiscountCents,
		draft.TaxCents,
		draft.TotalCents,
		draft.PaymentMethod,
		draft.Status,
	)
	if err != nil {
		return nil, fmt.Errorf("insert sale: %w", err)
	}

	saleID, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("sale last insert id: %w", err)
	}

	for _, line := range draft.Lines {
		if _, err = tx.ExecContext(ctx, `INSERT INTO sale_items (sale_id, product_id, product_name, sku, quantity, unit_price_cents, discount_cents, tax_cents, line_total_cents)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			saleID,
			line.ProductID,
			line.ProductName,
			line.SKU,
			line.Quantity,
			line.UnitPriceCents,
			line.DiscountCents,
			line.TaxCents,
			line.LineTotalCents,
		); err != nil {
			return nil, fmt.Errorf("insert sale line: %w", err)
		}

		result, errUpdate := tx.ExecContext(ctx, `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?`, line.Quantity, line.ProductID, line.Quantity)
		if errUpdate != nil {
			return nil, fmt.Errorf("update stock: %w", errUpdate)
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			return nil, errors.New("insufficient stock")
		}

		if _, err = tx.ExecContext(ctx, `INSERT INTO stock_movements (product_id, change_delta, reason, reference_id) VALUES (?, ?, ?, ?)`,
			line.ProductID,
			-line.Quantity,
			"SALE",
			saleID,
		); err != nil {
			return nil, fmt.Errorf("insert stock movement: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit sale: %w", err)
	}

	draft.ID = saleID
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

	var status string
	if err = tx.QueryRowContext(ctx, `SELECT status FROM sales WHERE id = ?`, saleID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("sale not found: %w", err)
		}
		return fmt.Errorf("load sale status: %w", err)
	}

	if status == "REFUNDED" {
		return nil
	}

	rows, err := tx.QueryContext(ctx, `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`, saleID)
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

	if _, err = tx.ExecContext(ctx, `UPDATE sales SET status = 'REFUNDED' WHERE id = ?`, saleID); err != nil {
		return fmt.Errorf("update sale status: %w", err)
	}

	for _, m := range movements {
		if _, err = tx.ExecContext(ctx, `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`, m.qty, m.productID); err != nil {
			return fmt.Errorf("restore stock: %w", err)
		}
		if _, err = tx.ExecContext(ctx, `INSERT INTO stock_movements (product_id, change_delta, reason, reference_id) VALUES (?, ?, ?, ?)`, m.productID, m.qty, "REFUND", saleID); err != nil {
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
	rows, err := r.db.QueryContext(ctx, `SELECT id, sale_number, customer_name, subtotal_cents, discount_cents, tax_cents, total_cents, payment_method, status
		FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC`, from, to)
	if err != nil {
		return nil, fmt.Errorf("query sales: %w", err)
	}
	defer rows.Close()

	var salesResults []sale.Sale

	for rows.Next() {
		var rec sale.Sale
		if err := rows.Scan(&rec.ID, &rec.SaleNumber, &rec.CustomerName, &rec.SubtotalCents, &rec.DiscountCents, &rec.TaxCents, &rec.TotalCents, &rec.PaymentMethod, &rec.Status); err != nil {
			return nil, fmt.Errorf("scan sale: %w", err)
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
	rows, err := r.db.QueryContext(ctx, `SELECT product_id, product_name, sku, quantity, unit_price_cents, discount_cents, tax_cents, line_total_cents
		FROM sale_items WHERE sale_id = ? ORDER BY id`, saleID)
	if err != nil {
		return nil, fmt.Errorf("query sale lines: %w", err)
	}
	defer rows.Close()

	var lines []sale.Line
	for rows.Next() {
		var line sale.Line
		if err := rows.Scan(&line.ProductID, &line.ProductName, &line.SKU, &line.Quantity, &line.UnitPriceCents, &line.DiscountCents, &line.TaxCents, &line.LineTotalCents); err != nil {
			return nil, fmt.Errorf("scan sale line: %w", err)
		}
		lines = append(lines, line)
	}
	return lines, rows.Err()
}
