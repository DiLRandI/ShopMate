package logging

import (
	"context"
	"log/slog"
	"os"
)

// Options control logger construction.
type Options struct {
	Env             string
	Locale          string
	EnableTelemetry bool
	Level           slog.Leveler
}

// New configures the root slog logger with sensible defaults for desktop apps.
func New(opts Options) *slog.Logger {
	locale := opts.Locale
	if locale == "" {
		locale = "en-US"
	}

	level := slog.LevelInfo
	if opts.Level != nil {
		level = opts.Level.Level()
	} else if opts.Env == "development" {
		level = slog.LevelDebug
	}

	handlerOpts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler = slog.NewJSONHandler(os.Stdout, handlerOpts)
	if opts.Env == "development" {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level:     level,
			AddSource: true,
		})
	}

	handler = handler.WithAttrs([]slog.Attr{
		slog.String("locale", locale),
	})

	handler = telemetryHandler{
		Handler: handler,
		enabled: opts.EnableTelemetry,
	}

	logger := slog.New(handler)
	if opts.EnableTelemetry {
		logger = logger.With("telemetryEnabled", true)
	}
	return logger
}

type telemetryHandler struct {
	slog.Handler
	enabled bool
}

func (t telemetryHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return t.Handler.Enabled(ctx, level)
}

func (t telemetryHandler) Handle(ctx context.Context, record slog.Record) error {
	if t.enabled && record.Level >= slog.LevelError {
		// Hook for telemetry sink (no-op placeholder to satisfy toggle requirement).
	}
	return t.Handler.Handle(ctx, record)
}

func (t telemetryHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return telemetryHandler{
		Handler: t.Handler.WithAttrs(attrs),
		enabled: t.enabled,
	}
}

func (t telemetryHandler) WithGroup(name string) slog.Handler {
	return telemetryHandler{
		Handler: t.Handler.WithGroup(name),
		enabled: t.enabled,
	}
}
