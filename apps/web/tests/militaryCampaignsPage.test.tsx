import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type { MilitaryCampaignsSdeInfo } from "~/app/military-campaigns/data";
import type {
  MilitaryCampaign,
  MilitaryCampaignsSnapshot,
} from "~/app/military-campaigns/esi";

const characterIds = jest.fn<() => number[]>();
const participation = jest.fn();
const login = jest.fn();

interface StubSession {
  accessTokenPayload: { scp: string[] | string };
  sessionExpired?: boolean;
}
const defaultSessions = (): Record<number, StubSession> => ({
  2: { accessTokenPayload: { scp: ["esi-mail.read_mail.v1"] } },
});
let sessions = defaultSessions();

jest.mock("@jitaspace/hooks", () => ({
  MILITARY_CAMPAIGN_ACTIVITY_SCOPE: "esi.activity.char:read",
  useAuthenticatedCharacterIds: () => characterIds(),
  useMultipleCharacterMilitaryCampaignObjectives: () => participation(),
  useAuthStore: (
    select: (state: { characters: Record<number, StubSession> }) => unknown,
  ) => select({ characters: sessions }),
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
}));
// The EVE rich-text viewer is a TipTap editor; its own tests cover it. Here it
// only has to receive the campaign's subtitle.
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content: string }) => (
    <div data-testid="eve-rich-text">{content}</div>
  ),
}));
jest.mock("~/components/Anchor", () => ({
  CharacterAnchor: ({ children }: { children?: ReactNode }) => children,
  FactionAnchor: ({ children }: { children?: ReactNode }) => children,
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
  pendingSubjectIds: [],
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  refetch: () => undefined,
  ...over,
});

function renderPage(
  data: MilitaryCampaignsSnapshot | null = snapshot,
  sdeInfo: MilitaryCampaignsSdeInfo | null = null,
) {
  const Page = require("~/app/military-campaigns/page.client").default;
  return render(
    <MantineProvider>
      <Page snapshot={data} sdeInfo={sdeInfo} />
    </MantineProvider>,
  );
}

const sdeInfo: MilitaryCampaignsSdeInfo = {
  campaigns: {
    "bbbbbbbb-0000-0000-0000-000000000000": {
      title: "State Corridor Initiative",
      subtitle: "Secure the corridor.",
      targetProgress: 30,
      issuerFactionId: 500001,
      issuerFactionName: "Caldari State",
    },
  },
  objectives: {
    "o1111111-x": {
      title: "Complete Basic Courier Missions",
      subtitle: null,
      targetProgress: 2000,
      contributionMethodName: "CompleteAgentMission",
    },
  },
};

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
    sessions = defaultSessions();
    characterIds.mockReturnValue([]);
    participation.mockReturnValue(envelope([], []));
  });

  it("lists every campaign, active first, by UUID when the SDE has no names, without a character section when signed out", () => {
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

  it("names campaigns and objectives from the SDE, with issuer and target", () => {
    characterIds.mockReturnValue([1]);
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
        ],
        [1],
      ),
    );

    renderPage(snapshot, sdeInfo);

    const card = campaignCard("bbbbbbbb");
    expect(
      within(card).getByRole("heading", { name: "State Corridor Initiative" }),
    ).toBeVisible();
    expect(within(card).getByText("Caldari State")).toBeVisible();
    expect(within(card).getByTestId("eve-rich-text")).toHaveTextContent(
      "Secure the corridor.",
    );
    expect(within(card).getByText("30 / 30")).toBeVisible();
    expect(within(card).getByText("Complete agent missions")).toBeVisible();
    expect(within(card).getByText("1,234 / 2,000")).toBeVisible();
    // An objective the SDE does not know keeps its UUID.
    expect(within(card).getByText("Objective o2222222")).toBeVisible();
    // The character's table names them too, linking to the campaign's card.
    expect(
      screen.getByRole("link", { name: "State Corridor Initiative" }),
    ).toHaveAttribute("href", "#campaign-bbbbbbbb-0000-0000-0000-000000000000");
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
    // No total contribution across objectives: they count in different units
    // (missions for one, ISK for another), so 70 + 5 would mean nothing.
    expect(screen.queryByText("75")).not.toBeInTheDocument();

    // The campaign it joined shows the "Your characters" column, and only the
    // objectives it joined have someone in it.
    const card = campaignCard("bbbbbbbb");
    expect(within(card).getAllByText("Your characters")).toHaveLength(2);
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

  it("re-requests a lone scope EVE wrote as a string, not its letters", () => {
    sessions = { 2: { accessTokenPayload: { scp: "publicData" } } };
    characterIds.mockReturnValue([2]);
    participation.mockReturnValue(envelope([], []));

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    expect(login).toHaveBeenCalledWith(
      ["publicData", "esi.activity.char:read"],
      "/military-campaigns",
    );
  });

  it("says a character's session expired rather than that it never granted access", () => {
    sessions = {
      2: {
        accessTokenPayload: { scp: ["esi.activity.char:read"] },
        sessionExpired: true,
      },
    };
    characterIds.mockReturnValue([2]);
    participation.mockReturnValue(envelope([], []));

    renderPage();

    expect(screen.getByText(/session has expired/)).toBeVisible();
    expect(screen.queryByText(/has not granted/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in again" }));
    expect(login).toHaveBeenCalledWith(
      ["esi.activity.char:read"],
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
