import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MarketTree } from "~/components/Market/readMarketTree";
import { MarketGroupsNavigation } from "~/components/Market/MarketGroupsNavigation";

jest.mock("@jitaspace/eve-components", () => ({ TypeAvatar: () => null }));
jest.mock("@jitaspace/ui", () => ({ EveIconAvatar: () => null }));

const group = (
  name: string,
  parentMarketGroupId: number | null,
  childrenMarketGroupIds: number[],
  types: { typeId: number; name: string }[] = [],
) => ({
  name,
  parentMarketGroupId,
  childrenMarketGroupIds,
  types,
  iconId: null,
});

const tree: MarketTree = {
  rootMarketGroupIds: [11, 4],
  marketGroups: {
    4: group("Ships", null, [1361]),
    1361: group(
      "Frigates",
      4,
      [],
      [
        { typeId: 587, name: "Rifter" },
        { typeId: 603, name: "Merlin" },
      ],
    ),
    11: group("Ammunition & Charges", null, []),
  },
};

// jsdom has no fetch Response; the component reads only `ok`, `status` and
// `json()`.
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function mockFetch(response: ReturnType<typeof jsonResponse>) {
  const fetchMock = jest.fn((_url: string) => Promise.resolve(response));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderNavigation() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MantineProvider>
  );
  return render(<MarketGroupsNavigation />, { wrapper });
}

describe("MarketGroupsNavigation", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches the tree from /api/market-tree and lists the root groups", async () => {
    const fetchMock = mockFetch(jsonResponse(tree));
    renderNavigation();

    expect(await screen.findByText("Ammunition & Charges")).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/market-tree");
    // Groups start closed.
    expect(screen.queryByText("Frigates")).not.toBeInTheDocument();
  });

  it("filters to a matching item and opens the groups above it", async () => {
    mockFetch(jsonResponse(tree));
    renderNavigation();
    await screen.findByText("Ships");

    await userEvent.type(screen.getByLabelText(/search market/i), "rift");

    expect(await screen.findByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("Frigates")).toBeInTheDocument();
    expect(screen.queryByText("Merlin")).not.toBeInTheDocument();
    expect(screen.queryByText("Ammunition & Charges")).not.toBeInTheDocument();
  });

  it("restores the whole tree when the search is cleared", async () => {
    mockFetch(jsonResponse(tree));
    renderNavigation();
    await screen.findByText("Ships");

    await userEvent.type(screen.getByLabelText(/search market/i), "rift");
    await screen.findByText("Rifter");
    await userEvent.click(screen.getByLabelText("Clear search"));

    await waitFor(() => {
      expect(screen.getByText("Ammunition & Charges")).toBeInTheDocument();
    });
    expect(screen.queryByText("Rifter")).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    mockFetch(jsonResponse(tree));
    renderNavigation();
    await screen.findByText("Ships");

    await userEvent.type(screen.getByLabelText(/search market/i), "titan");

    expect(
      await screen.findByText("No market groups or items match."),
    ).toBeInTheDocument();
  });

  it("filters without opening groups when a query matches too much", async () => {
    const many: MarketTree = {
      rootMarketGroupIds: [1],
      marketGroups: {
        1: group(
          "Things",
          null,
          [],
          Array.from({ length: 201 }, (_, i) => ({
            typeId: i + 1,
            name: `Item ${i + 1}`,
          })),
        ),
      },
    };
    mockFetch(jsonResponse(many));
    renderNavigation();
    await screen.findByText("Things");

    await userEvent.type(screen.getByLabelText(/search market/i), "item");

    expect(await screen.findByText(/201 matches/)).toBeInTheDocument();
    expect(screen.getByText("Things")).toBeInTheDocument();
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
  });

  it("reports a failed fetch instead of spinning forever", async () => {
    mockFetch(jsonResponse(null, 500));
    renderNavigation();

    expect(
      await screen.findByText("Could not load market groups."),
    ).toBeInTheDocument();
  });
});
