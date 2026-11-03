import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type {
  MilitaryCampaign,
  MilitaryCampaignsSnapshot,
} from "~/app/military-campaigns/esi";

const characterIds = jest.fn<() => number[]>();
const participation = jest.fn();
const login = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useAuthenticatedCharacterIds: () => characterIds(),
  useMultipleCharacterMilitaryCampaignObjectives: () => participation(),
  useAuthStore: (
    select: (state: {
      characters: Record<number, { accessTokenPayload: { scp: string[] } }>;
    }) => unknown,
  ) =>
    select({
      characters: {
        2: { accessTokenPayload: { scp: ["esi-mail.read_mail.v1"] } },
      },
    }),
}));
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => login(...args),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock("@jitaspace/eve-components", () => ({
  // Rendering the id makes "which character is this" assertable without
  // resolving names over ESI.
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
  CharacterAnchor: ({ children }: { children?: ReactNode }) => children,
}));

const campaign = (over: Partial<MilitaryCampaign>): MilitaryCampaign => ({
  id: "aaaaaaaa-0000-0000-0000-000000000000",
  state: "Completed",
  progress: 30,
  started: "2026-06-09T11:00:00.000Z",
  finished: "2026-09-16T10:00:00.000Z",
  objectives: [],
  ...over,
});

const objective = (id: string, state: MilitaryCampaign["state"]) => ({
  id,
  state,
  progress: 1234,
  participantsTotal: 10,
  participantsCommitted: 4,
  participantsContributors: 6,
  started: "2026-09-01T00:00:00.000Z",
  finished: state === "Active" ? null : "2026-09-02T00:00:00.000Z",
  lastModified: "2026-09-02T00:00:00.000Z",
});

const snapshot: MilitaryCampaignsSnapshot = {
  readAt: "2026-10-06T00:00:00.000Z",
  campaigns: [
    campaign({
      id: "cccccccc-0000-0000-0000-000000000000",
      objectives: [objective("o3333333-x", "Expired")],
    }),
    campaign({
      id: "bbbbbbbb-0000-0000-0000-000000000000",
      state: "Active",
      started: "2026-01-01T00:00:00.000Z",
      finished: null,
      objectives: [
        objective("o1111111-x", "Active"),
        objective("o2222222-x", "Completed"),
      ],
    }),
  ],
};

const envelope = (data: unknown[], subjectIds: number[], over = {}) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  refetch: () => undefined,
  ...over,
});

function renderPage(data: MilitaryCampaignsSnapshot | null = snapshot) {
  const Page = require("~/app/military-campaigns/page.client").default;
  return render(
    <MantineProvider>
      <Page snapshot={data} />
    </MantineProvider>,
  );
}

const campaignCard = (shortId: string) => {
  const card = document.getElementById(
    `campaign-${shortId}-0000-0000-0000-000000000000`,
  );
  if (!card) throw new Error(`no card for campaign ${shortId}`);
  return card;
};

describe("Military campaigns page", () => {
  beforeEach(() => {
    characterIds.mockReset();
    participation.mockReset();
    login.mockReset();
    characterIds.mockReturnValue([]);
    participation.mockReturnValue(envelope([], []));
  });

  it("lists every campaign, active first, without a character section when signed out", () => {
    renderPage();

    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toEqual(["Campaign bbbbbbbb", "Campaign cccccccc"]);
    expect(screen.getByText(/1 active campaign of 2 listed/)).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Your characters" }),
    ).not.toBeInTheDocument();
    // Its objectives are listed in the campaign's own table.
    expect(within(campaignCard("bbbbbbbb")).getAllByRole("row")).toHaveLength(
      3,
    );
  });

  it("says so when ESI did not answer, instead of an empty list", () => {
    renderPage(null);

    expect(screen.getByText("Campaigns unavailable")).toBeVisible();
  });

  it("mixes each character's participation into the campaigns", () => {
    characterIds.mockReturnValue([1, 2]);
    participation.mockReturnValue(
      envelope(
        [
          {
            subjectId: 1,
            id: "o1111111-x",
            campaign_id: "bbbbbbbb-0000-0000-0000-000000000000",
            is_committed: true,
            contributed: 70,
            last_modified: "2026-09-03T00:00:00.000Z",
          },
          {
            subjectId: 1,
            id: "o2222222-x",
            campaign_id: "bbbbbbbb-0000-0000-0000-000000000000",
            is_committed: false,
            contributed: 5,
            last_modified: "2026-09-02T00:00:00.000Z",
          },
        ],
        // Character 2 has not granted the scope.
        [1],
      ),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Your characters" }),
    ).toBeVisible();
    // The participation table: one row per objective a character joined.
    const participationRows = screen
      .getAllByRole("row")
      .filter((row) => row.textContent.includes("entity-1"));
    expect(participationRows.length).toBeGreaterThanOrEqual(2);
    // Character 1's totals: 1 campaign, 2 objectives, 1 committed, 75 given.
    expect(screen.getByText("75")).toBeVisible();

    // The campaign it joined shows the "Your characters" column, and only the
    // objectives it joined have someone in it.
    const card = campaignCard("bbbbbbbb");
    expect(within(card).getAllByText("Your characters").length).toBe(2);
  });

  it("offers to grant the scope to a character that has not, keeping its others", () => {
    characterIds.mockReturnValue([2]);
    participation.mockReturnValue(envelope([], []));

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    expect(login).toHaveBeenCalledWith(
      ["esi-mail.read_mail.v1", "esi.activity.char:read"],
      "/military-campaigns",
    );
  });

  it("tells a character with access that it has not joined anything yet", () => {
    characterIds.mockReturnValue([1]);
    participation.mockReturnValue(envelope([], [1]));

    renderPage();

    expect(
      screen.getByText(/None of your characters has taken part/),
    ).toBeVisible();
  });
});
