import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type {
  IncursionHistory,
  IncursionRatGroup,
  IncursionRow,
  IncursionsData,
} from "~/app/incursions/types";
import { computeNpcStats } from "~/lib/npcStats";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

// next/dynamic would async-import @mantine/charts; a stub keeps it synchronous.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <span data-testid="influence-chart" />,
}));

jest.mock("@jitaspace/eve-icons", () => ({ IncursionsIcon: () => null }));

// The shared stub, plus what this page needs from the real package.
jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/ui"),
  securityStatusBand: (securityStatus: number) => {
    if (Math.round(securityStatus * 10) / 10 >= 0.5) return "High-Sec";
    return securityStatus > 0 ? "Low-Sec" : "Null-Sec";
  },
  SolarSystemSecurityStatusBadge: () => null,
}));

// --- Fixtures --------------------------------------------------------------

const READ_AT = "2026-10-08T12:00:00.000Z";
const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) =>
  new Date(Date.parse(READ_AT) - hours * HOUR).toISOString();

// 30000001 is a staging system here; 30000003 is a mapped Vanguard system.
const CLAYSSON = 30000001;
const ADIERE = 30000003;
const ZD4 = 30005000;
const IBE = 30005001;

const row = (overrides: Partial<IncursionRow>): IncursionRow => ({
  incursionId: 1,
  constellationId: 20000001,
  factionId: 500019,
  type: "Incursion",
  source: "esi",
  stagingSolarSystemId: CLAYSSON,
  stagingSovereigntyAllianceId: null,
  stagingSovereigntyFactionId: 500004,
  state: "mobilizing",
  influence: 1,
  hasBoss: true,
  infestedSolarSystemIds: [CLAYSSON, ADIERE],
  firstSeenAt: hoursAgo(72),
  lastSeenAt: hoursAgo(0),
  endedAt: null,
  isObservedFromStart: true,
  establishedAt: hoursAgo(72),
  mobilizingAt: hoursAgo(14),
  withdrawingAt: null,
  ...overrides,
});

const HIGH_SEC = row({});
const NULL_SEC = row({
  incursionId: 2,
  constellationId: 20000002,
  stagingSolarSystemId: ZD4,
  stagingSovereigntyAllianceId: 99000001,
  stagingSovereigntyFactionId: null,
  state: "established",
  influence: 0.2,
  hasBoss: false,
  infestedSolarSystemIds: [ZD4, IBE],
  isObservedFromStart: false,
});
const endedHighSec = (endedHoursAgo: number) =>
  row({
    incursionId: 3,
    state: "withdrawing",
    influence: 0,
    hasBoss: false,
    endedAt: hoursAgo(endedHoursAgo),
  });
const IMPORTED = row({
  incursionId: 4,
  constellationId: 20000002,
  source: "eve_incursions_de",
  stagingSolarSystemId: null,
  stagingSovereigntyFactionId: null,
  influence: null,
  hasBoss: null,
  infestedSolarSystemIds: [],
  endedAt: "2020-01-02T00:00:00.000Z",
  firstSeenAt: "2020-01-01T00:00:00.000Z",
});

const LOOKUPS = {
  constellations: {
    20000001: { name: "Agiesseson", regionId: 10000001 },
    20000002: { name: "0KTC-R", regionId: 10000002 },
  },
  regions: { 10000001: "Sinq Laison", 10000002: "Venal" },
  factions: { 500019: "Sansha's Nation", 500004: "Gallente Federation" },
  alliances: { 99000001: "Test Alliance" },
  solarSystems: {
    [CLAYSSON]: {
      name: "Claysson",
      securityStatus: 0.9,
      longestWarpAu: 38,
      stations: [
        { stationId: 60000001, name: "Claysson IV - Station", hasRepair: true },
      ],
    },
    [ADIERE]: {
      name: "Adiere",
      securityStatus: 0.8,
      longestWarpAu: 58,
      stations: [],
    },
    [ZD4]: { name: "ZD4-G9", securityStatus: -0.3, longestWarpAu: 25 },
    [IBE]: { name: "2IBE-N", securityStatus: -0.2 },
  },
};

const pageData = (incursions: IncursionRow[]): IncursionsData => ({
  ...LOOKUPS,
  readAt: READ_AT,
  incursions,
  influence: { 1: [[Date.parse(hoursAgo(48)), 0.5]] },
  currentSovereignty: { [CLAYSSON]: { allianceId: null, factionId: 500004 } },
});

const HISTORY: IncursionHistory = {
  ...LOOKUPS,
  readAt: READ_AT,
  incursions: [endedHighSec(2), IMPORTED, HIGH_SEC],
  stateEvents: [
    [11, 1, hoursAgo(14), "state_changed", "mobilizing"],
    [10, 3, hoursAgo(30), "ended", "withdrawing"],
    [9, 77, hoursAgo(40), "appeared", "established"],
  ],
};

const RATS: IncursionRatGroup[] = [
  {
    groupId: 1056,
    name: "Incursion Sansha's Nation Battleship",
    rats: [
      {
        typeId: 3484,
        name: "Citizen Astur",
        // Turret: 51 rate of fire, 64 multiplier, 114/118 EM/thermal damage.
        stats: computeNpcStats(
          new Map([
            [263, 41800],
            [271, 0.32],
            [51, 5000],
            [64, 80],
            [114, 6],
            [118, 6],
            [247, 35000],
            [508, 118],
            [552, 540],
          ]),
        ),
      },
      { typeId: 3485, name: "Harmless Rat", stats: computeNpcStats(new Map()) },
    ],
  },
];

// --- Rendering ---------------------------------------------------------------

function renderPage(
  incursions: IncursionRow[],
  { historyOk = true }: { historyOk?: boolean } = {},
) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: historyOk,
      status: historyOk ? 200 : 500,
      json: () => Promise.resolve(HISTORY),
    }),
  ) as unknown as typeof fetch;
  const IncursionsPage = (
    require("~/app/incursions/page.client") as {
      default: (p: {
        data: IncursionsData;
        rats: IncursionRatGroup[];
      }) => ReactNode;
    }
  ).default;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <IncursionsPage data={pageData(incursions)} rats={RATS} />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

const openTab = (name: string) =>
  fireEvent.click(screen.getByRole("tab", { name }));

beforeEach(() => {
  window.history.replaceState(null, "", "/incursions");
  refresh.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Incursions page", () => {
  describe("Status tab", () => {
    it("lists active incursions as rows, high-sec first", () => {
      renderPage([NULL_SEC, HIGH_SEC, endedHighSec(2)]);
      const names = screen
        .getAllByRole("link", { name: /^(Agiesseson|0KTC-R)$/ })
        .map((link) => link.textContent);
      expect(names).toEqual(["Agiesseson", "0KTC-R"]);
      expect(screen.getByText("High-Sec ·", { exact: false })).toBeVisible();
      expect(screen.getByText("Boss")).toBeVisible();
      expect(screen.getByText("Mobilizing")).toBeVisible();
      expect(screen.getByText("Established")).toBeVisible();
      expect(screen.getAllByTestId("influence-chart")).toHaveLength(1);
      expect(screen.getByText("No influence recorded yet.")).toBeVisible();
    });

    it("shows the sovereignty holder, today's or the one stored", () => {
      renderPage([HIGH_SEC, NULL_SEC]);
      expect(
        screen.getByRole("link", { name: "Gallente Federation" }),
      ).toHaveAttribute("href", "/faction/500004");
      expect(
        screen.getByRole("link", { name: "Test Alliance" }),
      ).toHaveAttribute("href", "/alliance/99000001");
    });

    it("says when tracking began after an incursion spawned", () => {
      renderPage([NULL_SEC]);
      expect(screen.getByText(/^over 3 days ago$/)).toBeVisible();
    });

    it("lists systems by site role, with stations on demand", () => {
      renderPage([HIGH_SEC, NULL_SEC]);
      expect(screen.getAllByText("Staging")).not.toHaveLength(0);
      expect(screen.getByText("Vanguard")).toBeVisible();
      expect(screen.getByText("Infested")).toBeVisible();
      expect(screen.getByText("38 AU")).toBeVisible();
      expect(screen.queryByText("Claysson IV - Station")).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: "Show stations in Claysson" }),
      );
      expect(
        screen.getByRole("link", { name: "Claysson IV - Station" }),
      ).toHaveAttribute("href", "/station/60000001");
      fireEvent.click(
        screen.getByRole("button", { name: "Hide stations in Claysson" }),
      );
      expect(screen.queryByText("Claysson IV - Station")).toBeNull();
    });

    it("says so when no incursion is active", () => {
      renderPage([]);
      expect(
        screen.getByText("No incursions are active right now."),
      ).toBeVisible();
    });

    it.each([
      [2, "No high-sec incursion can spawn for another"],
      [20, "A new high-sec incursion should spawn within"],
      [40, "A new high-sec incursion should spawn any minute now."],
    ])(
      "counts down to the next high-sec spawn, %ih after the last ended",
      (hours, message) => {
        // The countdown runs on the clock: hold it at the data's read time.
        jest.useFakeTimers({ now: Date.parse(READ_AT) });
        renderPage([NULL_SEC, endedHighSec(hours)]);
        expect(screen.getByText(message, { exact: false })).toBeVisible();
      },
    );

    it("refreshes its data every five minutes while visible", () => {
      jest.useFakeTimers();
      renderPage([HIGH_SEC]);
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timeline tab", () => {
    it("loads the archive and lists appearances, state changes and ends by day", async () => {
      renderPage([HIGH_SEC]);
      openTab("Timeline");
      expect(window.location.hash).toBe("#timeline");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/incursions/history");
      expect(await screen.findByText("Incursion 77")).toBeVisible();
      expect(screen.getAllByText("Ended").length).toBeGreaterThan(0);
      expect(screen.getByText("Wed, 7 Oct 2026")).toBeVisible();
      expect(
        screen.queryByRole("columnheader", { name: "Sov. holder" }),
      ).toBeNull();
    });

    it("says so when the archive cannot be loaded", async () => {
      renderPage([HIGH_SEC], { historyOk: false });
      openTab("Timeline");
      expect(
        await screen.findByText(
          "The history could not be loaded. Try again in a moment.",
        ),
      ).toBeVisible();
    });

    it("opens from a link to #timeline", async () => {
      window.history.replaceState(null, "", "/incursions#timeline");
      renderPage([HIGH_SEC]);
      await waitFor(() =>
        expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
          "aria-selected",
          "true",
        ),
      );
      openTab("Status");
      expect(window.location.hash).toBe("");
    });
  });

  describe("Archive tab", () => {
    it("lists every ended incursion with its region and staging system", async () => {
      renderPage([HIGH_SEC]);
      openTab("Archive");
      expect(window.location.hash).toBe("#archive");
      expect(
        await screen.findByRole("link", { name: "Venal" }),
      ).toHaveAttribute("href", "/region/10000002");
      expect(screen.getByRole("link", { name: "Sinq Laison" })).toHaveAttribute(
        "href",
        "/region/10000001",
      );
      expect(screen.getByRole("link", { name: "Claysson" })).toBeVisible();
      // The two that ended; the active one is not in the archive.
      expect(
        screen.getByRole("table").querySelectorAll("tbody tr"),
      ).toHaveLength(2);
      const headers = screen
        .getAllByRole("columnheader")
        .map((header) => header.textContent);
      for (const removed of [
        "Source",
        "Last state",
        "Sov. holder",
        "Systems",
      ]) {
        expect(headers.join("|")).not.toContain(removed);
      }
    });

    it("says so when the archive cannot be loaded", async () => {
      renderPage([HIGH_SEC], { historyOk: false });
      openTab("Archive");
      expect(
        await screen.findByText(
          "The history could not be loaded. Try again in a moment.",
        ),
      ).toBeVisible();
    });
  });

  it("lists no change-by-change history anywhere", () => {
    renderPage([HIGH_SEC]);
    expect(screen.queryByRole("tab", { name: "History" })).toBeNull();
    expect(screen.queryByText("All changes")).toBeNull();
  });

  describe("Rats tab", () => {
    it("lists one rat per row with its damage, tank and class", () => {
      renderPage([HIGH_SEC]);
      openTab("Rats");
      const astur = screen.getByRole("link", { name: "Citizen Astur" });
      expect(astur).toHaveAttribute("href", "/type/3484?tab=combat");
      const rowOf = (link: HTMLElement) => link.closest("tr") as HTMLElement;
      expect(within(rowOf(astur)).getByText("Battleship")).toBeVisible();
      expect(within(rowOf(astur)).getByText("35 km")).toBeVisible();
      expect(within(rowOf(astur)).getByText("118 m/s")).toBeVisible();
      // A rat that does no damage shows dashes.
      const harmless = rowOf(
        screen.getByRole("link", { name: "Harmless Rat" }),
      );
      expect(within(harmless).getAllByText("—").length).toBeGreaterThan(1);
    });
  });
});
