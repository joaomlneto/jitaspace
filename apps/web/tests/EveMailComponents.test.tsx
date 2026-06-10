import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAccessToken = jest.fn();
const mockUseCharacterMailLabels = jest.fn();
const mockUseCharacterMail = jest.fn();
const mockUseCharacterMailingLists = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
  useCharacterMailLabels: (...args: unknown[]) =>
    mockUseCharacterMailLabels(...args),
  useCharacterMail: (...args: unknown[]) => mockUseCharacterMail(...args),
  useCharacterMailingLists: (...args: unknown[]) =>
    mockUseCharacterMailingLists(...args),
}));

const mockPutMail = jest.fn(() => Promise.resolve({}));
const mockDeleteMail = jest.fn(() => Promise.resolve({}));

jest.mock("@jitaspace/esi-client", () => ({
  putCharactersCharacterIdMailMailId: (...args: unknown[]) =>
    mockPutMail(...args),
  deleteCharactersCharacterIdMailMailId: (...args: unknown[]) =>
    mockDeleteMail(...args),
}));

const mockOpenConfirmModal = jest.fn();
const mockOpenContextModal = jest.fn();
const mockShowNotification = jest.fn();

jest.mock("@mantine/modals", () => ({
  openConfirmModal: (...args: unknown[]) => mockOpenConfirmModal(...args),
  openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
}));

jest.mock("@mantine/notifications", () => ({
  showNotification: (...args: unknown[]) => mockShowNotification(...args),
}));

jest.mock("@jitaspace/utils", () => ({
  // labels 1-8 are reserved special labels in EVE; treat <= 8 as special.
  isSpecialLabelId: (id?: number) => id !== undefined && id <= 8,
}));

// Passthrough / simple stubs for UI components
jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  EveEntityAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
  EveEntityAvatar: ({ entityId }: { entityId?: number }) => (
    <span>{`EntityAvatar ${entityId}`}</span>
  ),
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`Entity ${entityId}`}</span>
  ),
  EveMailSenderAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
  EveMailSenderAvatar: ({ from }: { from?: number }) => (
    <span>{`SenderAvatar ${from}`}</span>
  ),
  EveMailSenderName: ({ from }: { from?: number }) => (
    <span>{`Sender ${from}`}</span>
  ),
  FormattedDateText: ({ date }: { date?: Date }) => (
    <span>{date ? `Date ${date.toISOString()}` : "Date none"}</span>
  ),
}));

// Local component stubs ------------------------------------------------------
jest.mock("~/components/ColorSwatch", () => ({
  MailLabelColorSwatch: ({
    labelId,
    children,
  }: {
    labelId?: number;
    children?: ReactNode;
  }) => (
    <span data-testid="color-swatch" data-label-id={labelId}>
      {children}
    </span>
  ),
}));

jest.mock("~/components/Text", () => ({
  LabelName: ({ labelId }: { labelId?: number }) => (
    <span>{`LabelName ${labelId}`}</span>
  ),
  MailingListName: ({ mailingListId }: { mailingListId?: number }) => (
    <span>{`MailingList ${mailingListId}`}</span>
  ),
}));

jest.mock("~/components/Card", () => ({
  EveMailSenderCard: ({ messageId }: { messageId?: number }) => (
    <span>{`SenderCard ${messageId}`}</span>
  ),
}));

jest.mock("~/components/EveMail/MailMessageViewer", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-message-viewer">{content}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const LABELS_HOOK_VALUE = {
  data: {
    data: {
      labels: [
        { label_id: 1, name: "Inbox" }, // special
        { label_id: 16, name: "Work" }, // custom
        { label_id: 32, name: "Personal" }, // custom
      ],
    },
  },
  deleteLabel: jest.fn(() => Promise.resolve({ success: true })),
};

function withProvider(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccessToken.mockReturnValue({
    authHeaders: { Authorization: "Bearer test" },
  });
  mockUseCharacterMailLabels.mockReturnValue(LABELS_HOOK_VALUE);
  mockUseCharacterMailingLists.mockReturnValue({
    data: { data: [{ mailing_list_id: 777, name: "Newbros" }] },
  });
});

// ===========================================================================
// MessageMenu
// ===========================================================================

describe("MessageMenu", () => {
  const renderMenu = (mailOverrides = {}, extra = {}) => {
    const { MessageMenu } = require("~/components/EveMail/MessageMenu");
    const mail = {
      mail_id: 100,
      is_read: false,
      labels: [16],
      ...mailOverrides,
    };
    return withProvider(
      <MessageMenu characterId={123} mail={mail} {...extra} />,
    );
  };

  it("renders the menu trigger without crashing", () => {
    const { container } = renderMenu();
    // The ActionIcon trigger button is always present.
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("shows label items (only non-special) and read/delete actions when opened", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Message Labels")).toBeInTheDocument();
    // mail has label 16 -> "Remove Work"; label 32 not present -> "Add Personal"
    expect(screen.getByText("Remove Work")).toBeInTheDocument();
    expect(screen.getByText("Add Personal")).toBeInTheDocument();
    // special label 1 (Inbox) should be filtered out
    expect(screen.queryByText(/Inbox/)).not.toBeInTheDocument();
    expect(screen.getByText("Mark as Read")).toBeInTheDocument();
    expect(screen.getByText("Delete Message")).toBeInTheDocument();
  });

  it("shows 'Mark as Unread' when the mail is already read", async () => {
    const user = userEvent.setup();
    renderMenu({ is_read: true });
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Mark as Unread")).toBeInTheDocument();
  });

  it("adds a label and calls the ESI update + mutate when an 'Add' item is clicked", async () => {
    const user = userEvent.setup();
    const mutate = jest.fn();
    const data = [{ mail_id: 100, labels: [16] }];
    renderMenu({}, { mutate, data });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Add Personal"));

    expect(mockPutMail).toHaveBeenCalledTimes(1);
    const [charId, mailId, body] = mockPutMail.mock.calls[0] as [
      number,
      number,
      { labels: number[] },
    ];
    expect(charId).toBe(123);
    expect(mailId).toBe(100);
    expect(body.labels).toEqual([16, 32]);
    expect(mockShowNotification).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalled();
    // optimistic update mutated the data array in place
    expect(data[0]!.labels).toEqual([16, 32]);
  });

  it("removes a label when a 'Remove' item is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Remove Work"));

    expect(mockPutMail).toHaveBeenCalledTimes(1);
    const body = (mockPutMail.mock.calls[0] as [number, number, { labels: number[] }])[2];
    expect(body.labels).toEqual([]);
  });

  it("toggles read state via the ESI update when 'Mark as Read' is clicked", async () => {
    const user = userEvent.setup();
    const data = [{ mail_id: 100, is_read: false }];
    renderMenu({}, { data });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Mark as Read"));

    expect(mockPutMail).toHaveBeenCalledTimes(1);
    const body = (mockPutMail.mock.calls[0] as [number, number, { read: boolean }])[2];
    expect(body.read).toBe(true);
    expect(data[0]!.is_read).toBe(true);
  });

  it("opens a confirmation modal when 'Delete Message' is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Delete Message"));

    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      title: string;
      onConfirm: () => void;
    };
    expect(config.title).toBe("Delete Message");
  });

  it("calls the delete ESI endpoint when the delete modal is confirmed", async () => {
    const user = userEvent.setup();
    const mutate = jest.fn();
    const data = [{ mail_id: 100 }];
    renderMenu({}, { mutate, data });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Delete Message"));

    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    // Invoke the confirm callback directly (the modal itself is mocked).
    config.onConfirm();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockDeleteMail).toHaveBeenCalledWith(
      123,
      100,
      expect.anything(),
    );
  });

  it("notifies an error instead of updating when the mail_id is undefined (label)", async () => {
    const user = userEvent.setup();
    renderMenu({ mail_id: undefined, labels: [] });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Add Personal"));
    await Promise.resolve();
    expect(mockPutMail).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Message ID is undefined." }),
    );
  });

  it("notifies an error instead of toggling read when the mail_id is undefined", async () => {
    const user = userEvent.setup();
    renderMenu({ mail_id: undefined });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Mark as Read"));
    await Promise.resolve();
    expect(mockPutMail).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Message ID is undefined." }),
    );
  });

  it("notifies an error instead of deleting when the mail_id is undefined", async () => {
    const user = userEvent.setup();
    renderMenu({ mail_id: undefined });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Delete Message"));
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    config.onConfirm();
    await Promise.resolve();
    expect(mockDeleteMail).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Message ID is undefined." }),
    );
  });

  it("renders no label items when the labels hook has no labels", async () => {
    const user = userEvent.setup();
    mockUseCharacterMailLabels.mockReturnValueOnce({ data: { data: {} } });
    renderMenu();
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Message Labels")).toBeInTheDocument();
    expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Remove /)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// MailboxTable (responsive wrapper)
// ===========================================================================

describe("MailboxTable", () => {
  it("renders both the desktop and mobile tables", () => {
    const {
      MailboxTable,
    } = require("~/components/EveMail/MailboxTable/MailboxTable");
    const { container } = withProvider(
      <MailboxTable characterId={1} data={SAMPLE_MAILS} />,
    );
    // Two <table> elements are rendered (desktop + mobile variants).
    expect(container.querySelectorAll("table")).toHaveLength(2);
    // Subject appears in both tables.
    expect(screen.getAllByText("Hello there").length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// LabelManagementTable
// ===========================================================================

describe("LabelManagementTable", () => {
  const renderTable = () => {
    const {
      LabelManagementTable,
    } = require("~/components/EveMail/LabelManagementTable");
    return withProvider(<LabelManagementTable characterId={42} />);
  };

  it("renders a row per label with its name", () => {
    renderTable();
    expect(screen.getByText("LabelName 1")).toBeInTheDocument();
    expect(screen.getByText("LabelName 16")).toBeInTheDocument();
    expect(screen.getByText("LabelName 32")).toBeInTheDocument();
  });

  it("only shows a Delete button for non-special labels", () => {
    renderTable();
    // labels 16 and 32 are custom -> 2 delete buttons; label 1 is special.
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    expect(deleteButtons).toHaveLength(2);
  });

  it("opens a confirm modal when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as { title: string };
    expect(config.title).toBe("Delete Label");
  });

  it("calls deleteLabel and notifies success when confirmed", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    config.onConfirm();
    await Promise.resolve();
    await Promise.resolve();
    expect(LABELS_HOOK_VALUE.deleteLabel).toHaveBeenCalledWith(16);
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Label deleted" }),
    );
  });

  it("notifies an error when deleteLabel reports failure", async () => {
    const user = userEvent.setup();
    LABELS_HOOK_VALUE.deleteLabel.mockResolvedValueOnce({
      success: false,
      error: "boom",
    } as never);
    renderTable();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    config.onConfirm();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );
  });

  it("renders an empty table body when there are no labels", () => {
    mockUseCharacterMailLabels.mockReturnValueOnce({ data: { data: {} } });
    renderTable();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// DesktopMailboxTable
// ===========================================================================

const SAMPLE_MAILS = [
  {
    from: 555,
    is_read: false,
    labels: [16],
    mail_id: 1,
    subject: "Hello there",
    timestamp: "2024-01-01T10:00:00Z",
  },
  {
    from: 556,
    is_read: true,
    labels: [],
    mail_id: 2,
    subject: "",
    timestamp: "2024-01-02T11:00:00Z",
  },
  {
    from: 557,
    is_read: true,
    labels: [],
    mail_id: 3,
    subject: "Deleted one",
    timestamp: "2024-01-03T11:00:00Z",
    isDeleted: true,
  },
];

describe("DesktopMailboxTable", () => {
  const renderTable = (data = SAMPLE_MAILS) => {
    const {
      DesktopMailboxTable,
    } = require("~/components/EveMail/MailboxTable/DesktopMailboxTable");
    return withProvider(<DesktopMailboxTable characterId={1} data={data} />);
  };

  it("renders headers and one row per non-deleted mail", () => {
    renderTable();
    expect(screen.getByText("Sender")).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    // deleted mail filtered out
    expect(screen.queryByText("Deleted one")).not.toBeInTheDocument();
  });

  it("renders (No Subject) placeholder for empty subjects", () => {
    renderTable();
    expect(screen.getByText("(No Subject)")).toBeInTheDocument();
  });

  it("opens the view-message context modal when a subject is clicked", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByText("Hello there"));
    expect(mockOpenContextModal).toHaveBeenCalledTimes(1);
    const config = mockOpenContextModal.mock.calls[0]![0] as {
      modal: string;
      innerProps: { messageId: number };
    };
    expect(config.modal).toBe("viewMailMessage");
    expect(config.innerProps.messageId).toBe(1);
  });

  it("renders the label name for a mail that has labels", () => {
    renderTable();
    expect(screen.getByText("LabelName 16")).toBeInTheDocument();
  });

  it("renders without crashing when given an empty data array", () => {
    const { container } = renderTable([]);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});

// ===========================================================================
// MobileMailboxTable
// ===========================================================================

describe("MobileMailboxTable", () => {
  const renderTable = (data = SAMPLE_MAILS) => {
    const {
      MobileMailboxTable,
    } = require("~/components/EveMail/MailboxTable/MobileMailboxTable");
    return withProvider(<MobileMailboxTable characterId={1} data={data} />);
  };

  it("renders one row per non-deleted mail with subject", () => {
    renderTable();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByText("Deleted one")).not.toBeInTheDocument();
  });

  it("renders (No Subject) placeholder for empty subjects", () => {
    renderTable();
    expect(screen.getByText("(No Subject)")).toBeInTheDocument();
  });

  it("opens the view-message context modal when a subject is clicked", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByText("Hello there"));
    expect(mockOpenContextModal).toHaveBeenCalledTimes(1);
    const config = mockOpenContextModal.mock.calls[0]![0] as {
      innerProps: { messageId: number };
    };
    expect(config.innerProps.messageId).toBe(1);
  });

  it("renders without crashing when given an empty data array", () => {
    const { container } = renderTable([]);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});

// ===========================================================================
// MessagePanel
// ===========================================================================

describe("MessagePanel", () => {
  const MAIL_VALUE = {
    data: {
      data: {
        from: 555,
        timestamp: "2024-01-01T10:00:00Z",
        subject: "A subject",
        body: "Body text here",
        labels: [16],
        recipients: [
          { recipient_id: 600, recipient_type: "character" },
          { recipient_id: 777, recipient_type: "mailing_list" },
        ],
      },
    },
  };

  const renderPanel = (props = {}) => {
    mockUseCharacterMail.mockReturnValue(MAIL_VALUE);
    const { MessagePanel } = require("~/components/EveMail/MessagePanel");
    return withProvider(
      <MessagePanel characterId={1} data={[]} messageId={1} {...props} />,
    );
  };

  it("renders sender, subject, recipients and the message body", () => {
    renderPanel();
    expect(screen.getByText("From:")).toBeInTheDocument();
    expect(screen.getByText("Sender 555")).toBeInTheDocument();
    expect(screen.getByText("Subject: A subject")).toBeInTheDocument();
    expect(screen.getByText("To:")).toBeInTheDocument();
    // mailing-list recipient rendered via MailingListName
    expect(screen.getByText("MailingList 777")).toBeInTheDocument();
    // character recipient rendered via EveEntityName
    expect(screen.getByText("Entity 600")).toBeInTheDocument();
    expect(screen.getByTestId("mail-message-viewer")).toHaveTextContent(
      "Body text here",
    );
  });

  it("renders the assigned label name", () => {
    renderPanel();
    expect(screen.getByText("LabelName 16")).toBeInTheDocument();
  });

  it("shows 'No labels assigned' when the mail has no labels", () => {
    mockUseCharacterMail.mockReturnValue({
      data: { data: { ...MAIL_VALUE.data.data, labels: [] } },
    });
    const { MessagePanel } = require("~/components/EveMail/MessagePanel");
    withProvider(
      <MessagePanel characterId={1} data={[]} messageId={1} />,
    );
    expect(screen.getByText("No labels assigned")).toBeInTheDocument();
  });

  it("hides the sender block when hideSender is set", () => {
    renderPanel({ hideSender: true });
    expect(screen.queryByText("From:")).not.toBeInTheDocument();
  });

  it("hides the subject block when hideSubject is set", () => {
    renderPanel({ hideSubject: true });
    expect(screen.queryByText("Subject: A subject")).not.toBeInTheDocument();
  });

  it("hides recipients when hideRecipients is set", () => {
    renderPanel({ hideRecipients: true });
    expect(screen.queryByText("To:")).not.toBeInTheDocument();
  });

  it("hides the message body when hideMessage is set", () => {
    renderPanel({ hideMessage: true });
    expect(screen.queryByTestId("mail-message-viewer")).not.toBeInTheDocument();
  });

  it("renders without crashing when the mail data is undefined", () => {
    mockUseCharacterMail.mockReturnValue({ data: undefined });
    const { MessagePanel } = require("~/components/EveMail/MessagePanel");
    const { container } = withProvider(
      <MessagePanel characterId={1} data={[]} messageId={1} />,
    );
    expect(container).toBeInTheDocument();
  });
});
