package sqlite

import (
	"context"
	"database/sql"

	"shopmate/internal/domain/product"
)

// ProductRepository persists product records in SQLite.
type ProductRepository struct {
	db *sql.DB
}

// NewProductRepository constructs a repository against the shared database handle.
func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

// Create stores a new product and returns the persisted record.
func (r *ProductRepository) Create(ctx context.Context, input product.CreateInput) (*product.Product, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO products
			(name, sku, unit_price_cents, tax_rate, stock_quantity, reorder_level, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		input.Name,
		input.SKU,
		input.UnitPriceCents,
		input.TaxRate,
		input.StockQuantity,
		input.ReorderLevel,
		input.Notes,
	)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return r.getByID(ctx, id)
}

// GetByID fetches a product by primary key.
func (r *ProductRepository) GetByID(ctx context.Context, id int64) (*product.Product, error) {
	return r.getByID(ctx, id)
}

// List returns all products sorted by name ascending.
func (r *ProductRepository) List(ctx context.Context) ([]product.Product, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, sku, unit_price_cents, tax_rate, stock_quantity, reorder_level, notes
		 FROM products
		 ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]product.Product, 0)

	for rows.Next() {
		var p product.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.SKU, &p.UnitPriceCents, &p.TaxRate, &p.StockQuantity, &p.ReorderLevel, &p.Notes); err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *ProductRepository) getByID(ctx context.Context, id int64) (*product.Product, error) {
	var p product.Product
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, sku, unit_price_cents, tax_rate, stock_quantity, reorder_level, notes
		 FROM products WHERE id = ?`, id,
	).Scan(&p.ID, &p.Name, &p.SKU, &p.UnitPriceCents, &p.TaxRate, &p.StockQuantity, &p.ReorderLevel, &p.Notes)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
