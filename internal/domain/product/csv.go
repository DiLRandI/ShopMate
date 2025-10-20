package product

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

const (
	csvHeaderSKU            = "sku"
	csvHeaderName           = "name"
	csvHeaderCategory       = "category"
	csvHeaderUnitPrice      = "unit_price"
	csvHeaderTaxRatePercent = "tax_rate_percent"
	csvHeaderCurrentQty     = "current_qty"
	csvHeaderReorderLevel   = "reorder_level"
	csvHeaderNotes          = "notes"
)

var csvHeaders = []string{
	csvHeaderSKU,
	csvHeaderName,
	csvHeaderCategory,
	csvHeaderUnitPrice,
	csvHeaderTaxRatePercent,
	csvHeaderCurrentQty,
	csvHeaderReorderLevel,
	csvHeaderNotes,
}

// ImportRow represents a row in the product CSV import.
type ImportRow struct {
	SKU              string
	Name             string
	Category         string
	UnitPriceCents   int64
	TaxRateBasisPts  int64
	CurrentQty       int64
	ReorderLevel     int64
	Notes            string
	OriginalLine     int
	OriginalContents []string
}

// ToCreateInput converts the row into a create payload.
func (row ImportRow) ToCreateInput() CreateInput {
	return CreateInput{
		Name:               row.Name,
		SKU:                row.SKU,
		Category:           row.Category,
		UnitPriceCents:     row.UnitPriceCents,
		TaxRateBasisPoints: row.TaxRateBasisPts,
		CurrentQty:         row.CurrentQty,
		ReorderLevel:       row.ReorderLevel,
		Notes:              row.Notes,
	}
}

// ParseImportCSV decodes CSV data into rows enforcing the required format.
func ParseImportCSV(r io.Reader) ([]ImportRow, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	if err := validateHeaders(headers); err != nil {
		return nil, err
	}

	var (
		rows     []ImportRow
		lineNo   = 1 // header already consumed
		parseErr []string
	)

	for {
		record, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		lineNo++
		if err != nil {
			parseErr = append(parseErr, fmt.Sprintf("line %d: %v", lineNo, err))
			continue
		}

		row, err := parseRecord(lineNo, record)
		if err != nil {
			parseErr = append(parseErr, err.Error())
			continue
		}
		rows = append(rows, row)
	}

	if len(parseErr) > 0 {
		return rows, fmt.Errorf("csv validation: %s", strings.Join(parseErr, "; "))
	}

	return rows, nil
}

func validateHeaders(headers []string) error {
	if len(headers) != len(csvHeaders) {
		return fmt.Errorf("expected %d headers, got %d", len(csvHeaders), len(headers))
	}
	for i, expected := range csvHeaders {
		actual := strings.TrimSpace(strings.ToLower(headers[i]))
		if actual != expected {
			return fmt.Errorf("invalid header at position %d: expected %q got %q", i+1, expected, headers[i])
		}
	}
	return nil
}

func parseRecord(line int, record []string) (ImportRow, error) {
	if len(record) != len(csvHeaders) {
		return ImportRow{}, fmt.Errorf("line %d: expected %d columns got %d", line, len(csvHeaders), len(record))
	}

	get := func(idx int) string {
		if idx >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[idx])
	}

	row := ImportRow{
		OriginalLine:     line,
		OriginalContents: append([]string(nil), record...),
		SKU:              get(0),
		Name:             get(1),
		Category:         get(2),
		Notes:            get(7),
	}

	if row.SKU == "" {
		return ImportRow{}, fmt.Errorf("line %d: sku is required", line)
	}
	if row.Name == "" {
		return ImportRow{}, fmt.Errorf("line %d: name is required", line)
	}

	unitPrice, err := parseMoney(get(3))
	if err != nil {
		return ImportRow{}, fmt.Errorf("line %d: unit_price %w", line, err)
	}
	row.UnitPriceCents = unitPrice

	taxRate, err := parsePercentToBasisPoints(get(4))
	if err != nil {
		return ImportRow{}, fmt.Errorf("line %d: tax_rate_percent %w", line, err)
	}
	row.TaxRateBasisPts = taxRate

	currentQty, err := parseInt(get(5), false)
	if err != nil {
		return ImportRow{}, fmt.Errorf("line %d: current_qty %w", line, err)
	}
	row.CurrentQty = currentQty

	reorder, err := parseInt(get(6), false)
	if err != nil {
		return ImportRow{}, fmt.Errorf("line %d: reorder_level %w", line, err)
	}
	row.ReorderLevel = reorder

	return row, nil
}

func parseMoney(value string) (int64, error) {
	if strings.TrimSpace(value) == "" {
		return 0, nil
	}

	normalized := strings.ReplaceAll(value, ",", "")
	f, err := strconv.ParseFloat(normalized, 64)
	if err != nil {
		return 0, fmt.Errorf("must be a decimal number: %w", err)
	}
	if f < 0 {
		return 0, errors.New("must be >= 0")
	}
	return int64((f * 100) + 0.5), nil
}

func parsePercentToBasisPoints(value string) (int64, error) {
	if strings.TrimSpace(value) == "" {
		return 0, nil
	}
	normalized := strings.ReplaceAll(value, "%", "")
	f, err := strconv.ParseFloat(normalized, 64)
	if err != nil {
		return 0, fmt.Errorf("must be a number: %w", err)
	}
	if f < 0 {
		return 0, errors.New("must be >= 0")
	}
	return int64((f * 100) + 0.5), nil
}

func parseInt(value string, allowNegative bool) (int64, error) {
	if strings.TrimSpace(value) == "" {
		return 0, nil
	}
	i, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("must be an integer: %w", err)
	}
	if !allowNegative && i < 0 {
		return 0, errors.New("must be >= 0")
	}
	return i, nil
}

// WriteExportCSV renders products to CSV bytes following the import contract.
func WriteExportCSV(w io.Writer, products []Product) error {
	writer := csv.NewWriter(w)
	if err := writer.Write(csvHeaders); err != nil {
		return fmt.Errorf("write headers: %w", err)
	}

	for _, p := range products {
		record := []string{
			p.SKU,
			p.Name,
			p.Category,
			formatMoney(p.UnitPriceCents),
			formatBasisPoints(p.TaxRateBasisPoints),
			strconv.FormatInt(p.CurrentQty, 10),
			strconv.FormatInt(p.ReorderLevel, 10),
			p.Notes,
		}
		if err := writer.Write(record); err != nil {
			return fmt.Errorf("write record: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return fmt.Errorf("flush csv: %w", err)
	}
	return nil
}

func formatMoney(cents int64) string {
	return fmt.Sprintf("%.2f", float64(cents)/100.0)
}

func formatBasisPoints(bp int64) string {
	return fmt.Sprintf("%.2f", float64(bp)/100.0)
}
