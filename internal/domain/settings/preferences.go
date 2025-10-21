package settings

import "encoding/json"

// Preferences store UI and telemetry toggles.
type Preferences struct {
	Locale          string `json:"locale"`
	DarkMode        bool   `json:"darkMode"`
	EnableTelemetry bool   `json:"enableTelemetry"`
}

// ApplyDefaults ensures locale is set.
func (p *Preferences) ApplyDefaults() {
	if p.Locale == "" {
		p.Locale = "en-US"
	}
}

// MarshalJSON persists only the supported fields.
func (p Preferences) MarshalJSON() ([]byte, error) {
	type alias Preferences
	return json.Marshal(struct {
		alias
	}{
		alias: alias(p),
	})
}

// UnmarshalJSON supports both darkMode and legacy highContrast payloads.
func (p *Preferences) UnmarshalJSON(data []byte) error {
	type raw struct {
		Locale          string `json:"locale"`
		DarkMode        *bool  `json:"darkMode"`
		HighContrast    *bool  `json:"highContrast"`
		EnableTelemetry bool   `json:"enableTelemetry"`
	}
	var payload raw
	if err := json.Unmarshal(data, &payload); err != nil {
		return err
	}
	p.Locale = payload.Locale
	p.EnableTelemetry = payload.EnableTelemetry
	if payload.DarkMode != nil {
		p.DarkMode = *payload.DarkMode
	} else if payload.HighContrast != nil {
		p.DarkMode = *payload.HighContrast
	}
	return nil
}
