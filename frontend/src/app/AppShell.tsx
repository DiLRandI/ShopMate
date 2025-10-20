import type {PropsWithChildren} from "react";
import "../assets/styles/base.css";

type AppShellProps = PropsWithChildren<{
  activePage: "inventory" | "pos";
  onNavigate: (page: "inventory" | "pos") => void;
}>;

export function AppShell({children, activePage, onNavigate}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>ShopMate</h1>
        <span className="app-shell__tagline">Offline POS toolkit (scaffold)</span>
        <nav className="app-shell__nav" aria-label="Primary Navigation">
          <button
            type="button"
            className={`app-shell__nav-button ${activePage === "inventory" ? "app-shell__nav-button--active" : ""}`}
            onClick={() => onNavigate("inventory")}
          >
            Inventory
          </button>
          <button
            type="button"
            className={`app-shell__nav-button ${activePage === "pos" ? "app-shell__nav-button--active" : ""}`}
            onClick={() => onNavigate("pos")}
          >
            POS
          </button>
        </nav>
      </header>

      <main className="app-shell__content">
        {children}
      </main>
    </div>
  );
}
