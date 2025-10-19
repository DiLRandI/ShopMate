# ShopMate

ShopMate is an offline-first desktop application for small retailers that combines a Go (Wails) backend with a React (Vite, TypeScript) frontend. The app is delivered as a single cross-platform binary and focuses on quick product setup, dependable billing, and light-weight sales insights without requiring cloud services.

## Key Capabilities
- **Inventory & Product Management** – Create, edit, import, and export products with stock levels, tax rates, and low-stock alerts.
- **Point of Sale (POS)** – Build invoices via SKU lookup or barcode scanning, apply discounts, calculate taxes, and generate printable/PDF invoices.
- **Sales History** – Review historical invoices, reprint or export them, and process refunds that restore inventory.
- **Reports** – Produce daily snapshots, top-product leaderboards, and CSV exports for bookkeeping.
- **Data Portability** – Rely on a single SQLite database file with automated backups plus CSV/PDF exports for migration or auditing.
- **Offline-First Reliability** – Operates entirely on-device with resilience features such as WAL-mode SQLite and owner PIN protection for sensitive actions.

For detailed feature scope and roadmap information, see the [Product Requirements Document](docs/prd.md). Technical conventions, suggested directory layouts, and tooling expectations are available in the [Technical Architecture guide](docs/technical-architecture.md).

## Repository Layout
The project follows a Wails-friendly structure separating backend, frontend, and shared assets:

```
ShopMate/
├── Makefile                  # Common automation commands (dev, build, lint, test)
├── cmd/                      # Application entry points
├── internal/                 # Go application modules (app orchestration, domain, services)
├── frontend/                 # React + Vite source code
├── migrations/               # SQLite schema migrations embedded in the binary
├── docs/                     # Product and architecture documentation
└── tests/                    # Integration and smoke test suites
```

Some directories may be scaffolded as development progresses. Refer to the technical architecture document for the most up-to-date layout recommendations.

## Getting Started
1. **Install prerequisites**
   - Go 1.25.3 or newer
   - Node.js 20.19 or newer
   - Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
2. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ShopMate.git
   cd ShopMate
   ```
3. **Install dependencies**
   ```bash
   make deps
   ```
4. **Run the development environment**
   ```bash
   make dev
   ```
   This command proxies both the Wails backend and the React frontend for rapid iteration.
5. **Build production binaries**
   ```bash
   make build
   ```

## Quality & Tooling
- `make lint` runs Go vet alongside the frontend lint rules.
- `make test` executes Go unit tests and frontend Vitest suites.
- `make tidy` formats Go code, tidies modules, and applies frontend formatting.

## Contributing
1. Create a feature branch and make your changes.
2. Ensure the relevant linting and test commands pass.
3. Open a pull request describing the change, referencing any related issues or product requirements.

## License
This project will be released under an open-source license. Final licensing details will be provided before the first public release.
