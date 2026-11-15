import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { renderWithProviders } from "@/test/render-with-providers";
import DashboardPage from "./page";

test("renders the dashboard heading", () => {
  renderWithProviders(<DashboardPage />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Dashboard" }),
  ).toBeInTheDocument();
});
