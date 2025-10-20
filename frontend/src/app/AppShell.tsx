import type {PropsWithChildren} from "react";

type PageKey = "dashboard" | "pos" | "sales" | "reports" | "settings";

type NavItem = {
  key: PageKey;
  label: string;
  shortcut: string;
};

type AppShellProps = PropsWithChildren<{
  navItems: NavItem[];
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  lowStockCount: number;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  statusMessage?: string | null;
  shopName?: string | null;
}>;

export function AppShell({
  navItems,
  activePage,
  onNavigate,
  lowStockCount,
  isHighContrast,
  onToggleHighContrast,
  statusMessage,
  shopName,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__title">
          <h1>{shopName?.trim() ? shopName : "ShopMate"}</h1>
          <span className="app-shell__tagline">Offline-first POS for growing shops</span>
        </div>
        <div className="app-shell__status">
          <span className="status-chip" aria-live="polite">Low stock: {lowStockCount}</span>
          <button type="button" className="contrast-toggle" onClick={onToggleHighContrast}>
            {isHighContrast ? "Standard Theme" : "High Contrast"}
          </button>
        </div>
        <nav className="app-shell__nav" aria-label="Primary Navigation">
          {navItems.map(item => (
            <button
              key={item.key}
              type="button"
              className={`app-shell__nav-button ${activePage === item.key ? "app-shell__nav-button--active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span>{item.label}</span>
              <kbd>{item.shortcut}</kbd>
            </button>
          ))}
        </nav>
        {statusMessage && <p className="app-shell__status-message" role="status">{statusMessage}</p>}
      </header>

      <main className="app-shell__content" role="main">
        {children}
      </main>
    </div>
  );
}
