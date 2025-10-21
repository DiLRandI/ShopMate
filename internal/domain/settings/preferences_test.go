package settings

import "testing"

func TestPreferencesUnmarshalLegacyHighContrast(t *testing.T) {
	payload := `{"locale":"en-US","highContrast":true,"enableTelemetry":false}`

	var prefs Preferences
	if err := prefs.UnmarshalJSON([]byte(payload)); err != nil {
		t.Fatalf("unmarshal legacy payload: %v", err)
	}
	if !prefs.DarkMode {
		t.Fatalf("expected dark mode enabled from legacy highContrast")
	}
	if prefs.EnableTelemetry {
		t.Fatalf("expected telemetry false, got true")
	}
}
