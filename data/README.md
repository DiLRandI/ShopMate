# ShopMate Data Samples

This directory keeps developer-friendly fixtures that mirror the CSV contracts
documented in `docs/prd.md`.

- `seeds/products.csv` &mdash; starter inventory that can be loaded during
  development or demos.
- `templates/products_import_template.csv` &mdash; canonical header order for
  product imports, including a sample row with realistic values.
- `templates/products_export_sample.csv` &mdash; example of the export format
  that adds timestamps to the import headers.
- `templates/sales_export_sample.csv`, `templates/sale_items_export_sample.csv`,
  and `templates/stock_movements_export_sample.csv` demonstrate the bookkeeping
  files generated from the POS workflow.

All files are UTF-8 encoded and use cents-based decimal strings to avoid
floating-point drift during validation.
