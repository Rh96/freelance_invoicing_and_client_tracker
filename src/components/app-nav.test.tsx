import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppNav, isActivePath } from "./app-nav";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

describe("isActivePath", () => {
  it.each([
    ["/", "/", true],
    ["/clients", "/", false],
    ["/clients", "/clients", true],
    ["/clients/abc/edit", "/clients", true],
    ["/clientsx", "/clients", false],
    ["/invoices", "/clients", false],
  ])("%s with link %s → %s", (pathname, href, expected) => {
    expect(isActivePath(pathname, href)).toBe(expected);
  });
});

describe("AppNav", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("is a labelled navigation landmark with the three sections", () => {
    render(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Dashboard",
      "Clients",
      "Invoices",
    ]);
  });

  it("marks only the current section with aria-current", () => {
    navigation.pathname = "/clients/abc";
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Clients" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
