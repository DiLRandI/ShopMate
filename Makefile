SHELL := /bin/bash

GO ?= go
WAILS ?= wails
NODE ?= npm
FRONTEND_DIR := frontend
EXEC_TMP ?= /var/tmp/wails-tmp
GOOS ?= $(shell $(GO) env GOOS)
GOARCH ?= $(shell $(GO) env GOARCH)

.PHONY: help deps dev build lint lint-go lint-web test test-go test-web fmt tidy clean

help:
	@echo "Common targets:"
	@echo "  make deps   - Install Go/Vite dependencies."
	@echo "  make dev    - Run the Wails development server."
	@echo "  make build  - Produce release binaries via Wails."
	@echo "  make lint   - Run Go and frontend linters."
	@echo "  make test   - Run Go and frontend test suites."

deps:
	GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) install

dev:
	mkdir -p $(EXEC_TMP)
	GOOS=$(GOOS) GOARCH=$(GOARCH) TMPDIR=$(EXEC_TMP) GOTMPDIR=$(EXEC_TMP) $(WAILS) dev

build:
	mkdir -p $(EXEC_TMP)
	GOOS=$(GOOS) GOARCH=$(GOARCH) TMPDIR=$(EXEC_TMP) GOTMPDIR=$(EXEC_TMP) $(WAILS) build

lint: lint-go lint-web

lint-go:
	GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) vet ./...

lint-web:
	$(NODE) --prefix $(FRONTEND_DIR) run lint

test: test-go test-web

test-go:
	GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) test ./...

test-web:
	$(NODE) --prefix $(FRONTEND_DIR) run test

fmt:
	GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) fmt ./...

tidy: fmt
	GOOS=$(GOOS) GOARCH=$(GOARCH) $(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) run format

clean:
	rm -rf build/bin
