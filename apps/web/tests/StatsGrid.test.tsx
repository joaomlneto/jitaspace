import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// StatsGrid only imports a *type* from eve-icons (erased at runtime), so no
// hook/icon mocking is needed. The CSS module is mocked for class names.
jest.mock("~/components/UI/StatsGrid.module.css", () => ({}));

function renderComponent(data: unknown) {
  const { StatsGrid } = require("~/components/UI/StatsGrid");
  return render(
    <MantineProvider>
      {}
      <StatsGrid data={data as any} />
    </MantineProvider>,
  );
}

describe("StatsGrid", () => {
  it("renders a stat with a positive diff (up arrow) and an icon", () => {
    const Icon = ({ width }: { width?: number }) => (
      <svg data-testid="stat-icon" width={width} />
    );
    renderComponent([
      {
        title: "Wallet Balance",
        value: "1,234 ISK",
        diff: 12,
        description: "compared to last month",
        icon: Icon,
      },
    ]);
    expect(screen.getByText("Wallet Balance")).toBeInTheDocument();
    expect(screen.getByText("1,234 ISK")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("compared to last month")).toBeInTheDocument();
    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });

  it("renders a stat with a negative diff (down arrow)", () => {
    renderComponent([
      {
        title: "Active Orders",
        value: "42",
        diff: -5,
      },
    ]);
    expect(screen.getByText("Active Orders")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("renders a stat with no diff, icon or description", () => {
    renderComponent([
      {
        title: "Total Assets",
        value: "999",
      },
    ]);
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("999")).toBeInTheDocument();
    // no percentage text rendered when diff is undefined
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
