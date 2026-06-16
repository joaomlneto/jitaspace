import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// ZkillboardRecentSystemKills fetches recent kills from zKillboard via useSWR
// and groups them by location. We mock useSWR so no network happens and we can
// drive every branch (loading / loaded / lastChecked-from-Expires-header).
// ---------------------------------------------------------------------------

type SwrReturn = {
  data?: {
    body?: unknown[];
    headers: { get: (name: string) => string | null };
  };
  error?: unknown;
  isLoading: boolean;
  isValidating: boolean;
};

const mockUseSWR = jest.fn<() => SwrReturn>();

jest.mock("swr", () => ({
  __esModule: true,
  default: () => mockUseSWR(),
}));

// EveEntityName / TimeAgoText: pass-through stubs that surface the ids/dates so
// we can assert on the grouped output without loading the real ui barrel.
// EveEntityName moved to @jitaspace/eve-components.
jest.mock("@jitaspace/ui", () => {
  const React = require("react");
  return {
    TimeAgoText: ({ date }: { date?: Date }) =>
      React.createElement(
        "span",
        { "data-testid": "time-ago" },
        date instanceof Date ? date.toISOString() : "no-date",
      ),
  };
});

jest.mock("@jitaspace/eve-components", () => {
  const React = require("react");
  return {
    EveEntityName: ({ entityId }: { entityId?: number }) =>
      React.createElement(
        "span",
        { "data-testid": "entity-name" },
        `entity-${entityId ?? "?"}`,
      ),
  };
});

// KillmailButton is exercised on its own (travelComponents.test.tsx); stub it
// here so we only test the grouping/rendering done by this component.
jest.mock("~/components/Travel/KillmailButton", () => {
  const React = require("react");
  return {
    KillmailButton: ({
      killmailId,
      killmailHash,
    }: {
      killmailId: number;
      killmailHash: string;
    }) =>
      React.createElement(
        "span",
        { "data-testid": "killmail-button" },
        `km-${killmailId}-${killmailHash}`,
      ),
  };
});

function headersWith(map: Record<string, string>) {
  return { get: (name: string) => map[name] ?? null };
}

function kill(killmailId: number, locationID: number, hash: string) {
  return { killmail_id: killmailId, zkb: { locationID, hash } };
}

function renderComponent(solarSystemId: number | string = 30000142) {
  const {
    ZkillboardRecentSystemKills,
  } = require("~/components/Travel/ZkillboardRecentSystemKills");
  return render(
    <MantineProvider>
      <ZkillboardRecentSystemKills solarSystemId={solarSystemId} />
    </MantineProvider>,
  );
}

describe("ZkillboardRecentSystemKills", () => {
  beforeEach(() => {
    mockUseSWR.mockReset();
  });

  it("shows a loading state while SWR is fetching", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
    });
    renderComponent();
    expect(
      screen.getByText("Loading recent kills from zKillboard"),
    ).toBeInTheDocument();
  });

  it("stays in the loading state when data is present but body is undefined", () => {
    mockUseSWR.mockReturnValue({
      data: { body: undefined, headers: headersWith({}) },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    renderComponent();
    expect(
      screen.getByText("Loading recent kills from zKillboard"),
    ).toBeInTheDocument();
  });

  it("stays in the loading state while revalidating", () => {
    mockUseSWR.mockReturnValue({
      data: { body: [], headers: headersWith({}) },
      error: undefined,
      isLoading: false,
      isValidating: true,
    });
    renderComponent();
    expect(
      screen.getByText("Loading recent kills from zKillboard"),
    ).toBeInTheDocument();
  });

  it("renders one grouped row per distinct location with its kill count and entity name", () => {
    mockUseSWR.mockReturnValue({
      data: {
        body: [
          kill(1, 60003760, "h1"),
          kill(2, 60003760, "h2"),
          kill(3, 30000142, "h3"),
        ],
        headers: headersWith({}),
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    renderComponent();

    // Two distinct locations => an EveEntityName instance per location in the
    // summary (the component also repeats them inside the spoiler).
    const entityNames = screen.getAllByTestId("entity-name");
    expect(entityNames.some((n) => n.textContent === "entity-60003760")).toBe(
      true,
    );
    expect(entityNames.some((n) => n.textContent === "entity-30000142")).toBe(
      true,
    );

    // The summary row pairs each location's kill count with its EveEntityName.
    // The busy location (60003760) has 2 kills; that "2" count text is rendered
    // as a sibling text node of the name. Match the leaf Group whose collapsed
    // text is exactly the count + the name (getAllByText avoids multi-match
    // throws from ancestor elements that also contain the substring).
    const busyRows = screen.getAllByText((_content, element) => {
      const text = (element?.textContent ?? "").replace(/\s+/g, " ").trim();
      return text === "2 entity-60003760";
    });
    expect(busyRows.length).toBeGreaterThan(0);
  });

  it("renders a KillmailButton for every kill inside the spoiler", () => {
    mockUseSWR.mockReturnValue({
      data: {
        body: [kill(11, 60003760, "aa"), kill(22, 60003760, "bb")],
        headers: headersWith({}),
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    renderComponent();
    const buttons = screen.getAllByTestId("killmail-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("km-11-aa");
    expect(buttons[1]).toHaveTextContent("km-22-bb");
  });

  it("derives a 'Last checked' timestamp from the Expires header (one hour earlier)", () => {
    mockUseSWR.mockReturnValue({
      data: {
        body: [kill(1, 60003760, "h1")],
        headers: headersWith({ Expires: "2024-01-01T12:00:00Z" }),
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    renderComponent();
    // subHours(expires, 1) => 11:00:00Z
    expect(screen.getByText(/Last checked/)).toBeInTheDocument();
    expect(screen.getByTestId("time-ago")).toHaveTextContent(
      "2024-01-01T11:00:00.000Z",
    );
  });

  it("omits the 'Last checked' line when no Expires header is present", () => {
    mockUseSWR.mockReturnValue({
      data: {
        body: [kill(1, 60003760, "h1")],
        headers: headersWith({}),
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
    });
    renderComponent();
    expect(screen.queryByText(/Last checked/)).not.toBeInTheDocument();
  });
});
