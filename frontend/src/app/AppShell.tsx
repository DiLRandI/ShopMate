import {PropsWithChildren} from "react";
import "../assets/styles/base.css";

export function AppShell({children}: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>ShopMate</h1>
        <span className="app-shell__tagline">Offline POS toolkit (scaffold)</span>
      </header>

      <main className="app-shell__content">
        {children}
      </main>
    </div>
  );
}
