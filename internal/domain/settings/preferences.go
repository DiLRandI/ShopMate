package settings

// Preferences store UI and telemetry toggles.
type Preferences struct {
	Locale          string `json:"locale"`
	HighContrast    bool   `json:"highContrast"`
	EnableTelemetry bool   `json:"enableTelemetry"`
}

// ApplyDefaults ensures locale is set.
func (p *Preferences) ApplyDefaults() {
	if p.Locale == "" {
		p.Locale = "en-US"
	}
}
