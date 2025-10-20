GO ?= go
WAILS ?= wails
NODE ?= npm
FRONTEND_DIR := frontend

.PHONY: help deps dev build lint lint-go lint-web test test-go test-web fmt tidy clean

help:
	@echo "Common targets:"
	@echo "  make deps   - Install Go/Vite dependencies."
	@echo "  make dev    - Run the Wails development server."
	@echo "  make build  - Produce release binaries via Wails."
	@echo "  make lint   - Run Go and frontend linters."
	@echo "  make test   - Run Go and frontend test suites."

deps:
	$(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) install

dev:
	$(WAILS) dev

build:
	$(WAILS) build

lint: lint-go lint-web

lint-go:
	$(GO) vet ./...

lint-web:
	$(NODE) --prefix $(FRONTEND_DIR) run lint

test: test-go test-web

test-go:
	$(GO) test ./...

test-web:
	$(NODE) --prefix $(FRONTEND_DIR) run test

fmt:
	$(GO) fmt ./...

tidy: fmt
	$(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) run format

clean:
	rm -rf build/bin
