import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {AppShell} from "./AppShell";

describe("AppShell", () => {
  it("renders heading", () => {
    render(
      <AppShell
        navItems={[{key: "dashboard", label: "Products", shortcut: "Alt+1"}]}
        activePage="dashboard"
        onNavigate={() => undefined}
        lowStockCount={0}
        isHighContrast={false}
        onToggleHighContrast={() => undefined}
      >
        content
      </AppShell>
    );
    expect(screen.getByRole("heading", {name: /ShopMate/i})).toBeInTheDocument();
  });
});
