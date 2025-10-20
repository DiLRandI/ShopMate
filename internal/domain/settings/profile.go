package settings

import (
	"errors"
	"strings"
)

// Profile captures shop configuration surfaced in the UI and invoices.
type Profile struct {
	Name                      string `json:"name"`
	Address                   string `json:"address"`
	Phone                     string `json:"phone"`
	TaxID                     string `json:"taxId"`
	LogoPath                  string `json:"logoPath"`
	InvoiceFooter             string `json:"invoiceFooter"`
	DefaultTaxRateBasisPoints int64  `json:"defaultTaxRateBasisPoints"`
	CurrencySymbol            string `json:"currencySymbol"`
}

// ApplyDefaults ensures optional fields have sane defaults.
func (p *Profile) ApplyDefaults() {
	if p.CurrencySymbol == "" {
		p.CurrencySymbol = "$"
	}
	if p.DefaultTaxRateBasisPoints < 0 {
		p.DefaultTaxRateBasisPoints = 0
	}
}

// Validate enforces minimal requirements for invoicing.
func (p Profile) Validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New("shop name is required")
	}
	if p.DefaultTaxRateBasisPoints < 0 {
		return errors.New("default tax rate must be >= 0")
	}
	return nil
}
