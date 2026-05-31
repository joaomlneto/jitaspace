import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The mail page uses next/navigation (useRouter/useSearchParams/usePathname),
// @jitaspace/hooks (useCharacterMails, useSelectedCharacter), @jitaspace/utils,
// @jitaspace/eve-icons, @mantine/modals, and a couple of local components.
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockGet = jest.fn<() => string | null>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: (key: string) => mockGet() }),
  usePathname: () => "/mail",
}));

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterMails = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterMails: (...args: unknown[]) => mockUseCharacterMails(...args),
}));

jest.mock("@jitaspace/utils", () => ({
  toArrayIfNot: (v: unknown) => (Array.isArray(v) ? v : [v]),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  EvemailComposeIcon: () => <span>ComposeIcon</span>,
  EveMailIcon: () => <span>MailIcon</span>,
  EveMailTagIcon: () => <span>TagIcon</span>,
  GroupListIcon: () => <span>GroupListIcon</span>,
}));

const mockOpenContextModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  modals: {
    openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
  },
}));

jest.mock("~/components/MultiSelect/EveMailLabelMultiSelect", () => ({
  EveMailLabelMultiSelect: ({
    onChange,
  }: {
    onChange?: (value: string[]) => void;
  }) => (
    <button
      type="button"
      data-testid="label-multiselect"
      onClick={() => onChange?.(["1", "2"])}
    >
      Label MultiSelect
    </button>
  ),
}));

jest.mock("~/components/EveMail", () => ({
  MailboxTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="mailbox-table">{data.length} messages</div>
  ),
}));

const SAMPLE_MESSAGES = [
  { mail_id: 1, subject: "Hello", from: 100, timestamp: "2025-01-01T00:00:00Z" },
  { mail_id: 2, subject: "World", from: 101, timestamp: "2025-01-02T00:00:00Z" },
];

function defaultMailReturn(overrides?: Record<string, unknown>) {
  return {
    messages: SAMPLE_MESSAGES,
    hasMoreMessages: false,
    loadMoreMessages: jest.fn(),
    isLoading: false,
    mutate: jest.fn(),
    error: undefined,
    ...overrides,
  };
}

function renderPage() {
  const Page = require("~/app/mail/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Mail Page", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGet.mockReset();
    mockGet.mockReturnValue(null);
    mockUseSelectedCharacter.mockReset();
    mockUseCharacterMails.mockReset();
    mockOpenContextModal.mockReset();
  });

  it("renders the mailbox with messages for a selected character", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCharacterMails.mockReturnValue(defaultMailReturn());

    renderPage();

    expect(screen.getByText("EveMail")).toBeInTheDocument();
    expect(screen.getByTestId("mailbox-table")).toHaveTextContent(
      "2 messages",
    );
    // hasMoreMessages false + not loading -> "No more messages"
    expect(screen.getByText("No more messages")).toBeInTheDocument();
    // multiselect rendered because character present
    expect(screen.getByTestId("label-multiselect")).toBeInTheDocument();
  });

  it("opens compose / mailing-list / labels modals via the toolbar", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCharacterMails.mockReturnValue(defaultMailReturn());

    renderPage();

    fireEvent.click(screen.getByText("ComposeIcon"));
    fireEvent.click(screen.getByText("GroupListIcon"));
    fireEvent.click(screen.getByText("TagIcon"));

    expect(mockOpenContextModal).toHaveBeenCalledTimes(3);
    const modalNames = mockOpenContextModal.mock.calls.map(
      (c) => (c[0] as { modal: string }).modal,
    );
    expect(modalNames).toEqual(
      expect.arrayContaining([
        "composeMail",
        "viewMailingListSubscriptions",
        "manageMailLabels",
      ]),
    );
  });

  it("updates labels and navigates when the multiselect changes", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCharacterMails.mockReturnValue(defaultMailReturn());

    renderPage();

    fireEvent.click(screen.getByTestId("label-multiselect"));

    expect(mockPush).toHaveBeenCalledWith("/mail?labels=1%2C2");
  });

  it("shows the load-more button when more messages are available", () => {
    const loadMore = jest.fn();
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCharacterMails.mockReturnValue(
      defaultMailReturn({ hasMoreMessages: true, loadMoreMessages: loadMore }),
    );

    renderPage();

    const button = screen.getByRole("button", { name: "Load more messages" });
    fireEvent.click(button);
    expect(loadMore).toHaveBeenCalled();
  });

  it("shows the loading indicator while messages are loading", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCharacterMails.mockReturnValue(
      defaultMailReturn({
        messages: [],
        isLoading: true,
        hasMoreMessages: false,
      }),
    );

    renderPage();

    expect(screen.getByText("Loading messages")).toBeInTheDocument();
  });

  it("renders an error alert and no multiselect when there is no character", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacterMails.mockReturnValue(
      defaultMailReturn({ messages: [], error: new Error("boom") }),
    );

    renderPage();

    expect(screen.getByText("Error loading messages.")).toBeInTheDocument();
    expect(screen.queryByTestId("mailbox-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("label-multiselect")).not.toBeInTheDocument();

    // Clicking the mailing-list button without a character should NOT open a modal
    fireEvent.click(screen.getByText("GroupListIcon"));
    const mailingListCalls = mockOpenContextModal.mock.calls.filter(
      (c) =>
        (c[0] as { modal: string }).modal ===
        "viewMailingListSubscriptions",
    );
    expect(mailingListCalls).toHaveLength(0);
  });
});
