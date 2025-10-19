import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {AppShell} from "./AppShell";

describe("AppShell", () => {
  it("renders heading", () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole("heading", {name: /ShopMate/i})).toBeInTheDocument();
  });
});
