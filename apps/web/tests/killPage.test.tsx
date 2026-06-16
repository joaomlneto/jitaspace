import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// next/navigation — the page reads params.killId and searchParams.get("hash").
// ---------------------------------------------------------------------------
let mockKillId: string | undefined = "123";
let mockHash: string | null = null;

jest.mock("next/navigation", () => ({
  useParams: () => ({ killId: mockKillId }),
  useSearchParams: () => ({ get: (key: string) => (key === "hash" ? mockHash : null) }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

// ---------------------------------------------------------------------------
// swr — drives the zKillboard fetch branch. Controlled per test.
// ---------------------------------------------------------------------------
const mockUseSWR = jest.fn();
jest.mock("swr", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

// ---------------------------------------------------------------------------
// @jitaspace/hooks — useKillmail returns the ESI killmail payload.
// ---------------------------------------------------------------------------
const mockUseKillmail = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useKillmail: (...args: unknown[]) => mockUseKillmail(...args),
}));

// Pass-through @jitaspace/ui Proxy: components that wrap children must render
// their children, otherwise text assertions inside them would be dropped.
jest.mock(
  "@jitaspace/ui",
  () =>
    new Proxy(
      {},
      {
        get:
          () =>
          ({ children }: { children?: React.ReactNode } = {}) =>
            children ?? null,
      },
    ),
);

jest.mock("~/components/Fitting", () => ({
  EsiKillmailFittingCard: () => <div data-testid="fitting-card" />,
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const ZKB_META = {
  locationID: 60003760,
  hash: "abc123hash",
  fittedValue: 100,
  droppedValue: 200,
  destroyedValue: 300,
  totalValue: 500,
  points: 42,
  npc: true,
  solo: true,
  awox: true,
};

const FULL_KILLMAIL = {
  killmail_id: 123,
  killmail_time: "2024-01-01T00:00:00Z",
  solar_system_id: 30000142,
  victim: {
    character_id: 90000001,
    corporation_id: 98000001,
    alliance_id: 99000001,
    faction_id: 500001,
    ship_type_id: 587,
    damage_taken: 5000,
    items: [
      {
        item_type_id: 1234,
        flag: 5,
        quantity_dropped: 3,
      },
      {
        item_type_id: 5678,
        flag: 6,
        quantity_destroyed: 7,
      },
    ],
  },
  attackers: [
    {
      character_id: 91000001,
      corporation_id: 98000002,
      alliance_id: 99000002,
      ship_type_id: 588,
      weapon_type_id: 2456,
      damage_done: 3000,
      final_blow: true,
    },
    {
      faction_id: 500002,
      ship_type_id: 589,
      damage_done: 2000,
      final_blow: false,
    },
    {
      damage_done: 0,
      final_blow: false,
    },
  ],
};

function renderPage() {
  const Page = require("~/app/kill/[killId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Kill page (client)", () => {
  beforeEach(() => {
    mockKillId = "123";
    mockHash = null;
    mockUseSWR.mockReset();
    mockUseKillmail.mockReset();
    // Default: zKillboard returns the meta with hash, killmail resolves.
    mockUseSWR.mockReturnValue({ data: [{ zkb: ZKB_META }], isLoading: false });
    mockUseKillmail.mockReturnValue({ data: { data: FULL_KILLMAIL } });
  });

  it("renders the full killmail with victim, attackers, items and zKB stats", () => {
    renderPage();

    expect(screen.getByText("Killmail #123")).toBeInTheDocument();

    // zKillboard ISK stats card + badges
    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.getByText("Destroyed")).toBeInTheDocument();
    expect(screen.getByText("Dropped")).toBeInTheDocument();
    expect(screen.getByText("Fitted Value")).toBeInTheDocument();
    expect(screen.getByText("Points")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Solo")).toBeInTheDocument();
    // "NPC" appears both as the zKB badge and as the NPC attacker's pilot text.
    expect(screen.getAllByText("NPC").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("AWOX")).toBeInTheDocument();

    // External links
    expect(screen.getByText("zKillboard")).toBeInTheDocument();
    expect(screen.getByText("EVE-Kill")).toBeInTheDocument();

    // Victim section
    expect(screen.getByText("Victim")).toBeInTheDocument();
    expect(screen.getByText("5,000 damage taken")).toBeInTheDocument();

    // Fitting card child rendered
    expect(screen.getByTestId("fitting-card")).toBeInTheDocument();

    // Attackers section: 3 attackers, with a "Final" blow badge
    expect(screen.getByText("Attackers (3)")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();

    // Items section: one dropped, one destroyed
    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Dropped (1)")).toBeInTheDocument();
    expect(screen.getByText("Destroyed (1)")).toBeInTheDocument();
  });

  it("renders a loading state while zKillboard is still fetching", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    mockUseKillmail.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Loading killmail…")).toBeInTheDocument();
  });

  it("renders the not-found state when zKillboard returns no results", () => {
    mockUseSWR.mockReturnValue({ data: [], isLoading: false });
    mockUseKillmail.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Killmail #123")).toBeInTheDocument();
    expect(
      screen.getByText(/Could not load killmail data/),
    ).toBeInTheDocument();
    expect(screen.getByText("View on zKillboard")).toBeInTheDocument();
  });

  it("returns null for a non-numeric killId", () => {
    mockKillId = "not-a-number";
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
    mockUseKillmail.mockReturnValue({ data: undefined });

    renderPage();

    // The page returns null for a non-finite killId, so none of its content
    // (header, loading, or not-found block) is rendered.
    expect(screen.queryByText(/Killmail #/)).not.toBeInTheDocument();
    expect(screen.queryByText("Loading killmail…")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Could not load killmail data/),
    ).not.toBeInTheDocument();
  });

  it("uses the hash query param and skips the zKillboard meta card", () => {
    // hash provided → SWR key is null, no zkbMeta, killmail still resolves.
    mockHash = "explicithash";
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
    mockUseKillmail.mockReturnValue({ data: { data: FULL_KILLMAIL } });

    renderPage();

    expect(screen.getByText("Killmail #123")).toBeInTheDocument();
    // No zKillboard stats card when hash is supplied directly.
    expect(screen.queryByText("Total Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Solo")).not.toBeInTheDocument();
    // Core sections still render.
    expect(screen.getByText("Victim")).toBeInTheDocument();
    expect(screen.getByText("Attackers (3)")).toBeInTheDocument();
  });
});
