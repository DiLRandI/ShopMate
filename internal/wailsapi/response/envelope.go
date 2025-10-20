package response

// Envelope wraps backend responses for Wails bindings.
type Envelope[T any] struct {
	OK    bool   `json:"ok"`
	Data  *T     `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

// Success produces a successful envelope with data.
func Success[T any](value T) Envelope[T] {
	return Envelope[T]{
		OK:   true,
		Data: &value,
	}
}

// SuccessNoData produces a successful envelope without payload.
func SuccessNoData[T any]() Envelope[T] {
	return Envelope[T]{OK: true}
}

// Failure produces an error envelope.
func Failure[T any](message string) Envelope[T] {
	return Envelope[T]{
		OK:    false,
		Error: message,
	}
}
