import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@jitaspace/eve-components", () => ({
  MarketGroupAvatar: () => <span>market-group-avatar</span>,
}));

jest.mock("@jitaspace/ui", () => ({
  TypeAvatar: () => <span>type-avatar</span>,
}));

const marketGroups = {
  1: {
    name: "Ships",
    parentMarketGroupId: null,
    childrenMarketGroupIds: [2],
    types: [{ typeId: 587, name: "Rifter" }],
  },
  2: {
    name: "Frigates",
    parentMarketGroupId: 1,
    childrenMarketGroupIds: [],
    types: [{ typeId: 588, name: "Reaper" }],
  },
};

const withProvider = (node: React.ReactNode) =>
  render(<MantineProvider>{node}</MantineProvider>);

const load = () =>
  require("~/components/Market/MarketGroupNavLink")
    .MarketGroupNavLink as React.ComponentType<{
    marketGroups: typeof marketGroups;
    marketGroupId: number;
  }>;

describe("MarketGroupNavLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the market group label", () => {
    const MarketGroupNavLink = load();
    withProvider(
      <MarketGroupNavLink marketGroups={marketGroups} marketGroupId={1} />,
    );
    expect(screen.getByText("Ships")).toBeInTheDocument();
  });

  it("renders nothing for an unknown market group id", () => {
    const MarketGroupNavLink = load();
    // Wrap in a marker element — MantineProvider injects <style> tags into the
    // render container, so assert that the component itself produced no output.
    withProvider(
      <div data-testid="wrapper">
        <MarketGroupNavLink marketGroups={marketGroups} marketGroupId={999} />
      </div>,
    );
    expect(screen.getByTestId("wrapper")).toBeEmptyDOMElement();
  });

  it("reveals child market groups and types when expanded", async () => {
    const user = userEvent.setup();
    const MarketGroupNavLink = load();
    withProvider(
      <MarketGroupNavLink marketGroups={marketGroups} marketGroupId={1} />,
    );

    // children are collapsed initially
    expect(screen.queryByText("Frigates")).not.toBeInTheDocument();
    expect(screen.queryByText("Rifter")).not.toBeInTheDocument();

    await user.click(screen.getByText("Ships"));

    // child market group (recursed) and the leaf type link are now shown
    expect(screen.getByText("Frigates")).toBeInTheDocument();
    expect(screen.getByText("Rifter")).toBeInTheDocument();
  });
});
