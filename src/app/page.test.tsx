import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import DashboardPage from "./page";

test("renders the dashboard heading", () => {
  render(<DashboardPage />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeInTheDocument();
});
