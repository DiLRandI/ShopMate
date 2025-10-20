package invoice

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"html/template"
	"strings"
	"time"

	"shopmate/internal/adapters/storage/sqlite"
	domainsale "shopmate/internal/domain/sale"
	domainsettings "shopmate/internal/domain/settings"
)

//go:embed templates/*.html
var templateFS embed.FS

// Service generates invoice representations for sales.
type Service struct {
	salesRepo    *sqlite.SaleRepository
	settingsRepo *sqlite.SettingsRepository
	baseTemplate *template.Template
}

// NewService constructs an invoice service.
func NewService(sales *sqlite.SaleRepository, settings *sqlite.SettingsRepository) (*Service, error) {
	tpl, err := template.New("invoice.html").Funcs(template.FuncMap{
		"currency": func(int64) string { return "" },
	}).ParseFS(templateFS, "templates/invoice.html")
	if err != nil {
		return nil, fmt.Errorf("parse invoice template: %w", err)
	}
	return &Service{
		salesRepo:    sales,
		settingsRepo: settings,
		baseTemplate: tpl,
	}, nil
}

// GenerateHTML renders the invoice as HTML.
func (s *Service) GenerateHTML(ctx context.Context, saleID int64) (string, error) {
	saleData, profile, err := s.loadContext(ctx, saleID)
	if err != nil {
		return "", err
	}

	tpl, err := s.baseTemplate.Clone()
	if err != nil {
		return "", fmt.Errorf("clone template: %w", err)
	}

	tpl = tpl.Funcs(template.FuncMap{
		"currency": func(cents int64) string {
			return formatCurrency(profile.CurrencySymbol, cents)
		},
	})

	var buf bytes.Buffer
	if err := tpl.ExecuteTemplate(&buf, "invoice.html", map[string]interface{}{
		"Sale":    saleData,
		"Profile": profile,
	}); err != nil {
		return "", fmt.Errorf("execute invoice template: %w", err)
	}
	return buf.String(), nil
}

// GeneratePDF renders the invoice as a PDF byte slice.
func (s *Service) GeneratePDF(ctx context.Context, saleID int64) ([]byte, error) {
	saleData, profile, err := s.loadContext(ctx, saleID)
	if err != nil {
		return nil, err
	}
	pdfBytes, err := renderSimplePDF(profile, saleData)
	if err != nil {
		return nil, err
	}
	return pdfBytes, nil
}

func (s *Service) loadContext(ctx context.Context, saleID int64) (*domainsale.Sale, domainsettings.Profile, error) {
	saleData, err := s.salesRepo.GetByID(ctx, saleID)
	if err != nil {
		return nil, domainsettings.Profile{}, fmt.Errorf("load sale: %w", err)
	}
	profile, err := s.settingsRepo.LoadProfile(ctx)
	if err != nil {
		return nil, domainsettings.Profile{}, fmt.Errorf("load profile: %w", err)
	}
	return saleData, profile, nil
}

func formatCurrency(symbol string, cents int64) string {
	if symbol == "" {
		symbol = "$"
	}
	return fmt.Sprintf("%s%.2f", symbol, float64(cents)/100.0)
}

func renderSimplePDF(profile domainsettings.Profile, sale *domainsale.Sale) ([]byte, error) {
	lines := []string{
		fmt.Sprintf("%s Invoice %s", profile.Name, sale.SaleNumber),
		fmt.Sprintf("Date: %s", sale.Timestamp.Format(time.RFC1123)),
	}
	if sale.CustomerName != "" {
		lines = append(lines, fmt.Sprintf("Customer: %s", sale.CustomerName))
	}
	lines = append(lines,
		fmt.Sprintf("Payment Method: %s", sale.PaymentMethod),
		"",
		"Items:",
	)

	for _, line := range sale.Lines {
		lines = append(lines, fmt.Sprintf("- %s x%d @ %s = %s", line.ProductName, line.Quantity, formatCurrency(profile.CurrencySymbol, line.UnitPriceCents), formatCurrency(profile.CurrencySymbol, line.LineTotalCents)))
	}

	lines = append(lines,
		"",
		fmt.Sprintf("Subtotal: %s", formatCurrency(profile.CurrencySymbol, sale.SubtotalCents)),
		fmt.Sprintf("Discount: %s", formatCurrency(profile.CurrencySymbol, sale.DiscountCents)),
		fmt.Sprintf("Tax: %s", formatCurrency(profile.CurrencySymbol, sale.TaxCents)),
		fmt.Sprintf("Total: %s", formatCurrency(profile.CurrencySymbol, sale.TotalCents)),
	)

	if profile.InvoiceFooter != "" {
		lines = append(lines, "", profile.InvoiceFooter)
	}

	content := buildTextContent(lines)

	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")
	offsets := make([]int, 6)

	writeObj := func(id int, body string) {
		offsets[id] = buf.Len()
		fmt.Fprintf(&buf, "%d 0 obj\n%s\nendobj\n", id, body)
	}

	writeObj(1, "<< /Type /Catalog /Pages 2 0 R >>")
	writeObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
	writeObj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
	writeObj(4, fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(content), content))
	writeObj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

	xrefOffset := buf.Len()
	buf.WriteString("xref\n")
	fmt.Fprintf(&buf, "0 %d\n", len(offsets))
	buf.WriteString("0000000000 65535 f \n")
	for i := 1; i < len(offsets); i++ {
		fmt.Fprintf(&buf, "%010d 00000 n \n", offsets[i])
	}
	buf.WriteString("trailer << /Size 6 /Root 1 0 R >>\n")
	buf.WriteString("startxref\n")
	fmt.Fprintf(&buf, "%d\n%%%%EOF", xrefOffset)

	return buf.Bytes(), nil
}

func buildTextContent(lines []string) string {
	var sb strings.Builder
	sb.WriteString("BT\n/F1 12 Tf\n14 TL\n50 800 Td\n")
	for i, line := range lines {
		escaped := pdfEscape(line)
		if i == 0 {
			fmt.Fprintf(&sb, "(%s) Tj\n", escaped)
			continue
		}
		sb.WriteString("T*\n")
		fmt.Fprintf(&sb, "(%s) Tj\n", escaped)
	}
	sb.WriteString("ET")
	return sb.String()
}

func pdfEscape(input string) string {
	replacer := strings.NewReplacer("\\", "\\\\", "(", "\\(", ")", "\\)")
	return replacer.Replace(input)
}
