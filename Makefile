SHELL := /bin/bash

GO ?= go
WAILS ?= wails
NODE ?= npm
FRONTEND_DIR := frontend

EXEC_TMP ?= $(CURDIR)/.wails-tmp
EXEC_TMP_CACHE := $(EXEC_TMP)/go-cache
EXEC_TMP_TMP := $(EXEC_TMP)/tmp

GOOS ?= $(shell $(GO) env GOOS)
GOARCH ?= $(shell $(GO) env GOARCH)

.PHONY: help deps dev build lint lint-go lint-web test test-go test-web fmt tidy clean prepare-env

help:
	@echo "Common targets:"
	@echo "  make deps   - Install Go/Vite dependencies."
	@echo "  make dev    - Run the Wails development server."
	@echo "  make build  - Produce release binaries via Wails."
	@echo "  make lint   - Run Go and frontend linters."
	@echo "  make test   - Run Go and frontend test suites."

prepare-env:
	mkdir -p $(EXEC_TMP_CACHE) $(EXEC_TMP_TMP)
	chmod 755 $(EXEC_TMP) $(EXEC_TMP_CACHE) $(EXEC_TMP_TMP)

deps: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOCACHE=$(EXEC_TMP_CACHE) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) $(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) install

dev: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) GOCACHE=$(EXEC_TMP_CACHE) $(WAILS) dev

build: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) GOCACHE=$(EXEC_TMP_CACHE) $(WAILS) build

lint: lint-go lint-web

lint-go: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOCACHE=$(EXEC_TMP_CACHE) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) $(GO) vet ./...

lint-web:
	$(NODE) --prefix $(FRONTEND_DIR) run lint

test: test-go test-web

test-go: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOCACHE=$(EXEC_TMP_CACHE) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) $(GO) test ./...

test-web:
	$(NODE) --prefix $(FRONTEND_DIR) run test

fmt: prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOCACHE=$(EXEC_TMP_CACHE) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) $(GO) fmt ./...

tidy: fmt prepare-env
	GOOS=$(GOOS) GOARCH=$(GOARCH) GOCACHE=$(EXEC_TMP_CACHE) TMPDIR=$(EXEC_TMP_TMP) GOTMPDIR=$(EXEC_TMP_TMP) $(GO) mod tidy
	$(NODE) --prefix $(FRONTEND_DIR) run format

clean:
	rm -rf build/bin
