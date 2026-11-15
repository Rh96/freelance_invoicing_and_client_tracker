import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteFocus } from "./route-focus";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

function Shell() {
  return (
    <>
      <nav>
        <button type="button">Clients</button>
      </nav>
      <main id="main" tabIndex={-1}>
        <RouteFocus />
      </main>
    </>
  );
}

describe("RouteFocus", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("moves focus to <main> when navigation left it on <body>", () => {
    const { rerender } = render(<Shell />);
    navigation.pathname = "/clients/new";
    rerender(<Shell />);
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("leaves focus alone when it's still on something visible", () => {
    const { rerender } = render(<Shell />);
    screen.getByRole("button", { name: "Clients" }).focus();
    navigation.pathname = "/clients";
    rerender(<Shell />);
    expect(screen.getByRole("button", { name: "Clients" })).toHaveFocus();
  });

  it("doesn't move focus on the first render", () => {
    render(<Shell />);
    expect(screen.getByRole("main")).not.toHaveFocus();
  });
});
