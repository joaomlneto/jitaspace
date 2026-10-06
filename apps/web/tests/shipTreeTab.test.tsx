import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

// ---------------------------------------------------------------------------
// The faction and race pages' Ship Tree tab: the shared ShipTreePanel with an
// Omega clone switch whose state lives in the URL. The page tests mock this
// module away (it loads the tree library); these exercise it directly.
// ---------------------------------------------------------------------------

const mockShipTreeView = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => null,
  useAuthStoreHasHydrated: () => true,
  useCharacterSkills: () => ({
    hasToken: false,
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useCharacterSkillQueue: () => ({ data: undefined }),
  useMarketPrices: () => ({ data: {} }),
}));
jest.mock("@jitaspace/ui", () => ({
  LoginWithEveOnlineButton: () => (
    <button type="button">log in with eve</button>
  ),
}));
jest.mock("@jitaspace/eve-components", () => ({
  CharacterName: () => null,
}));
jest.mock("~/lib/eveOnlineLogin", () => ({ loginWithEveOnline: jest.fn() }));
// The real view draws the tree from fetched data; here it is a probe for what
// the tab hands it.
jest.mock("../../../packages/ship-tree/ShipTreeView", () => ({
  ShipTreeView: (props: Record<string, unknown>) => {
    mockShipTreeView(props);
    return <div data-testid="ship-tree-view" />;
  },
}));

const ShipTreeTab = require("~/components/ShipTree/ShipTreeTab")
  .default as (props: { faction: number }) => React.JSX.Element;

const CALDARI = 500001;

function renderTab(searchParams = "") {
  const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
  const result = render(
    <MantineProvider>
      <ShipTreeTab faction={CALDARI} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate }) },
  );
  return { ...result, onUrlUpdate };
}

const lastViewProps = () =>
  mockShipTreeView.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe("Ship Tree tab", () => {
  beforeEach(() => {
    mockShipTreeView.mockReset();
  });

  it("draws the faction it is given as an alpha clone by default", () => {
    renderTab();

    expect(screen.getByTestId("ship-tree-view")).toBeInTheDocument();
    expect(lastViewProps()).toMatchObject({ faction: CALDARI, isOmega: false });
    expect(
      screen.getByRole("switch", { name: "Omega clone" }),
    ).not.toBeChecked();
    // The shared panel's skills prompt and credit line come along.
    expect(
      screen.getByText("Log in to see which ships you can fly."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/snapshot of EVE's static data/),
    ).toBeInTheDocument();
  });

  it("reads the clone type from the URL", () => {
    renderTab("?tab=ship-tree&omega=true");

    expect(screen.getByRole("switch", { name: "Omega clone" })).toBeChecked();
    expect(lastViewProps().isOmega).toBe(true);
  });

  it("writes the clone type to the URL", async () => {
    const { onUrlUpdate } = renderTab("?tab=ship-tree");

    fireEvent.click(screen.getByRole("switch", { name: "Omega clone" }));

    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("omega")).toBe(
        "true",
      ),
    );
    expect(lastViewProps().isOmega).toBe(true);
  });
});
