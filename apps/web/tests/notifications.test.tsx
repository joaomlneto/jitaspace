import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";

import type * as NotificationsModule from "~/components/Notifications";
import type { NotificationListItem } from "~/components/Notifications";

const mockUseMultipleCharacterNotifications = jest.fn();
const mockUseEsiName = jest.fn((_id?: number) => ({
  category: undefined as string | undefined,
  loading: true,
}));
jest.mock("@jitaspace/hooks", () => ({
  useMultipleCharacterNotifications: () =>
    mockUseMultipleCharacterNotifications(),
  useEsiName: (id?: number) => mockUseEsiName(id),
}));

const mockTypeNames = jest.fn<() => Record<string, string> | undefined>();
jest.mock("~/components/Notifications/useNotificationTypeNames", () => ({
  useNotificationTypeNames: () => mockTypeNames(),
}));

jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span>{`Recipient ${characterId}`}</span>
  ),
  TimeAgoText: ({ date }: { date: Date }) => (
    <span>{`Ago ${date.toISOString()}`}</span>
  ),
}));

jest.mock("@jitaspace/eve-components", () => ({
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`Entity ${entityId}`}</span>
  ),
}));

// Every icon the type mapping can pick, each rendering its own name so a test
// can tell which one a notification was drawn with.
jest.mock("@jitaspace/eve-icons", () => {
  const names = [
    "AgentIcon",
    "AlliancesIcon",
    "BountyOfficeIcon",
    "ContactsIcon",
    "CorporationIcon",
    "DecorationsIcon",
    "FactionalWarfareIcon",
    "IncursionsIcon",
    "IndustryIcon",
    "InsuranceIcon",
    "JumpClonesIcon",
    "KillReportIcon",
    "KillRightsIcon",
    "LockedContainerIcon",
    "LPStoreIcon",
    "MercenaryAllyIcon",
    "MercenaryIcon",
    "MoonDrillIcon",
    "MutualWarsIcon",
    "NoteIcon",
    "OpportunitiesTreeIcon",
    "PeopleAndPlacesIcon",
    "PersonalStandingsIcon",
    "RecruitmentIcon",
    "RedeemIcon",
    "SkillsIcon",
    "SovereigntyIcon",
    "StationIcon",
    "StructureBrowserIcon",
    "SurrenderIcon",
    "VotesIcon",
    "WalletIcon",
    "WarsIcon",
  ];
  return Object.fromEntries(
    names.map((name) => {
      const Icon = () => <span>{name}</span>;
      Icon.displayName = name;
      return [name, Icon];
    }),
  );
});

jest.mock("@tabler/icons-react", () => ({
  IconRss: () => <span>rss</span>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    [prop: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const load = () =>
  require("~/components/Notifications") as typeof NotificationsModule;

const notification = (
  overrides: Partial<NotificationListItem>,
): NotificationListItem => ({
  notification_id: 1,
  sender_id: 1000125,
  sender_type: "corporation",
  timestamp: "2026-10-01T12:00:00Z",
  type: "CorpAppInvitedMsg",
  ...overrides,
});

// Fresh per test, so one test's cached lookups never answer another's.
let queryClient: QueryClient;
function Providers({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider env="test">{children}</MantineProvider>
    </QueryClientProvider>
  );
}
const renderWithMantine = (node: ReactNode) =>
  render(node, { wrapper: Providers });

/** Answer every fetch with this status and body. */
const mockFetch = (status: number, body: unknown = {}) => {
  const fetchMock = jest.fn((_url: string) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mockTypeNames.mockReset();
  mockUseMultipleCharacterNotifications.mockReset();
  mockUseEsiName.mockReset();
  mockUseEsiName.mockReturnValue({ category: undefined, loading: true });
});

describe("notification types", () => {
  it.each([
    ["CorpWarDeclaredMsg", "WarsIcon"],
    ["AllyJoinedWarAllyMsg", "MercenaryAllyIcon"],
    ["MutualWarInviteSent", "MutualWarsIcon"],
    ["CorpAllBillMsg", "WalletIcon"],
    ["CorpAppInvitedMsg", "RecruitmentIcon"],
    ["StructureUnderAttack", "StructureBrowserIcon"],
    ["SovStructureReinforced", "SovereigntyIcon"],
    ["KillReportVictim", "KillReportIcon"],
    ["CorpNewCEOMsg", "CorporationIcon"],
    ["AllianceCapitalChanged", "AlliancesIcon"],
    ["SomeTypeCcpAddsLater", "NoteIcon"],
  ])("draws %s with %s", (type, icon) => {
    const { notificationTypeIcon } = load();
    expect(notificationTypeIcon(type).displayName).toBe(icon);
  });

  it.each([
    ["CorpAppInvitedMsg", "Corp App Invited"],
    ["CloneRevokedMsg2", "Clone Revoked"],
    ["NPCStandingsGained", "NPC Standings Gained"],
    ["FWCharKickMsg", "FW Char Kick"],
    ["IndustryOperationFinished", "Industry Operation Finished"],
  ])("humanizes %s as %s", (type, label) => {
    expect(load().humanizeNotificationType(type)).toBe(label);
  });

  it("prefers the SDE display name, falling back to the humanized type", () => {
    const { notificationTitle } = load();
    const names = { CorpAppInvitedMsg: "Corporation Invitation" };
    expect(notificationTitle("CorpAppInvitedMsg", names)).toBe(
      "Corporation Invitation",
    );
    expect(notificationTitle("OperationFinished", names)).toBe(
      "Operation Finished",
    );
    expect(notificationTitle("CorpAppInvitedMsg", undefined)).toBe(
      "Corp App Invited",
    );
  });
});

describe("NotificationList", () => {
  it("lists newest first, titled from the SDE names", () => {
    mockTypeNames.mockReturnValue({ KillReportVictim: "Kill report - Victim" });
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({ notification_id: 1, type: "CorpAppInvitedMsg" }),
          notification({
            notification_id: 2,
            type: "KillReportVictim",
            timestamp: "2026-10-09T08:00:00Z",
          }),
        ]}
      />,
    );
    const titles = screen
      .getAllByText(/Kill report - Victim|Corp App Invited/)
      .map((node) => node.textContent);
    expect(titles).toEqual(["Kill report - Victim", "Corp App Invited"]);
  });

  it("shows the sender, unless ESI marks it 'other'", () => {
    mockTypeNames.mockReturnValue(undefined);
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({ notification_id: 1, sender_id: 98000001 }),
          notification({
            notification_id: 2,
            sender_id: 1,
            sender_type: "other",
          }),
        ]}
      />,
    );
    expect(screen.getByText("Entity 98000001")).toBeInTheDocument();
    expect(screen.queryByText("Entity 1")).not.toBeInTheDocument();
  });

  it("marks only unread notifications", () => {
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({ notification_id: 1, is_read: true }),
          notification({ notification_id: 2 }),
          notification({ notification_id: 3, is_read: false }),
        ]}
      />,
    );
    expect(screen.getAllByLabelText("Unread")).toHaveLength(2);
  });

  it("shows recipients only when asked, and caps the list at the limit", () => {
    const { NotificationList } = load();
    const items = [1, 2, 3].map((id) =>
      notification({ notification_id: id, subjectId: 90000000 + id }),
    );
    const { rerender } = renderWithMantine(
      <NotificationList notifications={items} />,
    );
    expect(screen.queryByText(/Recipient/)).not.toBeInTheDocument();

    rerender(
      <NotificationList notifications={items} showRecipient limit={2} />,
    );
    expect(screen.getAllByText(/Recipient/)).toHaveLength(2);
  });

  it("keeps the same notification id apart across recipients", () => {
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({ notification_id: 7, subjectId: 1 }),
          notification({ notification_id: 7, subjectId: 2 }),
        ]}
        showRecipient
      />,
    );
    expect(screen.getByText("Recipient 1")).toBeInTheDocument();
    expect(screen.getByText("Recipient 2")).toBeInTheDocument();
  });

  it("gives the exact time in EVE time on hover", () => {
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[notification({ timestamp: "2026-10-01T12:34:56Z" })]}
      />,
    );
    expect(screen.getByTitle("2026-10-01 12:34 EVE")).toBeInTheDocument();
  });

  it("links a notification to what it is about, and reports the click", () => {
    const onNavigate = jest.fn();
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({
            notification_id: 1,
            type: "KillReportVictim",
            text: "killMailHash: abc123\nkillMailID: 42\nvictimShipTypeID: 670\n",
          }),
          notification({ notification_id: 2, type: "InsurancePayoutMsg" }),
        ]}
        onNavigate={onNavigate}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/kill/42?hash=abc123");
    // The subject line names the lost ship.
    expect(within(link).getByText("Entity 670")).toBeInTheDocument();
    // Only the kill report links anywhere.
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("opens the war a notification is about, once it is found", async () => {
    const fetchMock = mockFetch(200, { warId: 712345 });
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({
            type: "WarDeclared",
            sender_type: "other",
            timestamp: "2026-10-08T12:00:00Z",
            text: "declaredByID: 99005338\nagainstID: 98000001\n",
          }),
        ]}
      />,
    );
    // Not a link while the lookup is pending, so a quick click goes nowhere
    // rather than to the fallback.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(await screen.findByRole("link")).toHaveAttribute(
      "href",
      "/war/712345",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wars/find?aggressor=99005338&at=2026-10-08T12%3A00%3A00Z&defender=98000001",
    );
  });

  it("falls back to the declarer when we have no such war", async () => {
    mockFetch(404, { error: "No such war." });
    // Goonswarm Federation's legacy id says nothing of its kind; ESI does.
    mockUseEsiName.mockReturnValue({ category: "alliance", loading: false });
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({
            type: "WarDeclared",
            sender_type: "other",
            text: "declaredByID: 1354830081\nagainstID: 98000001\n",
          }),
        ]}
      />,
    );
    expect(await screen.findByRole("link")).toHaveAttribute(
      "href",
      "/alliance/1354830081",
    );
    expect(mockUseEsiName).toHaveBeenCalledWith(1354830081);
  });

  it("links a legacy-numbered party once ESI says what it is", () => {
    const { NotificationList } = load();
    const invite = [
      notification({
        type: "CorpAppInvitedMsg",
        sender_type: "other",
        text: "corpID: 1354830081\n",
      }),
    ];
    const { rerender } = renderWithMantine(
      <NotificationList notifications={invite} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    mockUseEsiName.mockReturnValue({ category: "corporation", loading: false });
    // Fresh objects: the real hook re-renders its subscriber, the mock cannot.
    rerender(
      <NotificationList notifications={invite.map((n) => ({ ...n }))} />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/corporation/1354830081",
    );
  });

  it("fills and decodes SDE titles", () => {
    mockTypeNames.mockReturnValue({
      CorporationLeft: "Quit {corp_name}",
      StructureServicesOffline: "Fuel Depleted &amp; Offline",
    });
    const { NotificationList } = load();
    renderWithMantine(
      <NotificationList
        notifications={[
          notification({
            notification_id: 1,
            type: "CorporationLeft",
            sender_type: "other",
            text: "corpID: 98000001\n",
          }),
          notification({
            notification_id: 2,
            type: "StructureServicesOffline",
            sender_type: "other",
          }),
          notification({
            notification_id: 3,
            type: "CorporationLeft",
            sender_type: "other",
            timestamp: "2026-09-01T00:00:00Z",
          }),
        ]}
      />,
    );
    expect(screen.getByText("Fuel Depleted & Offline")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, node) => node?.textContent === "Quit Entity 98000001",
      ),
    ).toBeInTheDocument();
    // Without a corpID to fill the placeholder, the type is humanized instead.
    expect(screen.getByText("Corporation Left")).toBeInTheDocument();
  });

  it("says so when there is nothing to list", () => {
    const { NotificationList } = load();
    renderWithMantine(<NotificationList notifications={[]} />);
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});

describe("NotificationFeedButton", () => {
  const envelope = (overrides: Record<string, unknown>) => ({
    data: [],
    isPending: false,
    errors: [],
    subjectIds: [1],
    ...overrides,
  });

  it("renders nothing until a character grants the notifications scope", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({ subjectIds: [] }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("counts unread notifications across characters", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({
        subjectIds: [1, 2],
        data: [
          notification({ notification_id: 1, subjectId: 1 }),
          notification({ notification_id: 2, subjectId: 2 }),
          notification({ notification_id: 3, subjectId: 2, is_read: true }),
        ],
      }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    expect(
      screen.getByRole("button", { name: "2 unread notifications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("caps the badge at 99+", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({
        data: Array.from({ length: 120 }, (_, i) =>
          notification({ notification_id: i }),
        ),
      }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("opens the merged history, with recipients when there are several characters", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({
        subjectIds: [1, 2],
        data: [
          notification({ notification_id: 1, subjectId: 1 }),
          notification({ notification_id: 2, subjectId: 2, is_read: true }),
        ],
        errors: [{ subjectId: 2, error: new Error("boom") }],
      }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "1 unread notifications" }),
    );

    const dropdown = screen.getByRole("dialog");
    expect(within(dropdown).getByText("Notification History")).toBeVisible();
    expect(within(dropdown).getByText("Recipient 1")).toBeInTheDocument();
    expect(within(dropdown).getByText("Recipient 2")).toBeInTheDocument();
    expect(
      within(dropdown).getByText("Could not load 1 of 2 characters"),
    ).toBeInTheDocument();
    expect(
      within(dropdown).queryByRole("button", { name: "Show older" }),
    ).not.toBeInTheDocument();
  });

  it("closes when a notification link is followed", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({
        data: [
          notification({
            type: "CorpAppInvitedMsg",
            text: "corpID: 98000001\n",
          }),
        ],
      }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    fireEvent.click(
      screen.getByRole("button", { name: "1 unread notifications" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: /Invited to join/,
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists 50 at a time, newest first, with older ones on request", () => {
    mockUseMultipleCharacterNotifications.mockReturnValue(
      envelope({
        data: Array.from({ length: 120 }, (_, i) =>
          notification({
            notification_id: i,
            is_read: true,
            // Newest first is id 119, so the first page is ids 119..70.
            timestamp: new Date(
              Date.UTC(2026, 0, 1) + i * 60_000,
            ).toISOString(),
          }),
        ),
      }),
    );
    const { NotificationFeedButton } = load();
    renderWithMantine(<NotificationFeedButton />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    const dropdown = screen.getByRole("dialog");
    const rows = () => within(dropdown).getAllByText(/^Ago /);
    expect(rows()).toHaveLength(50);

    const showOlder = within(dropdown).getByRole("button", {
      name: "Show older",
    });
    fireEvent.click(showOlder);
    expect(rows()).toHaveLength(100);
    fireEvent.click(showOlder);
    expect(rows()).toHaveLength(120);
    expect(
      within(dropdown).queryByRole("button", { name: "Show older" }),
    ).not.toBeInTheDocument();
  });
});
