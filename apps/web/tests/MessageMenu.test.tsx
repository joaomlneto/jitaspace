import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — declared at top; the component is lazy-require()d inside each test
// AFTER these are registered (jest.mock is not auto-hoisted in this project).
// ---------------------------------------------------------------------------

const mockUseAccessToken = jest.fn();
const mockUseCharacterMailLabels = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
  useCharacterMailLabels: (...args: unknown[]) =>
    mockUseCharacterMailLabels(...args),
}));

const mockPutMail = jest.fn<() => Promise<unknown>>(() => Promise.resolve({}));
const mockDeleteMail = jest.fn<() => Promise<unknown>>(() =>
  Promise.resolve({}),
);

jest.mock("@jitaspace/esi-client", () => ({
  putCharactersCharacterIdMailMailId: (...args: unknown[]) =>
    mockPutMail(...args),
  deleteCharactersCharacterIdMailMailId: (...args: unknown[]) =>
    mockDeleteMail(...args),
}));

// labels 1-8 are reserved special labels in EVE; treat <= 8 as special.
jest.mock("@jitaspace/utils", () => ({
  isSpecialLabelId: (id?: number) => id !== undefined && id <= 8,
}));

const mockOpenConfirmModal = jest.fn();
const mockShowNotification = jest.fn();

jest.mock("@mantine/modals", () => ({
  openConfirmModal: (...args: unknown[]) => mockOpenConfirmModal(...args),
}));

jest.mock("@mantine/notifications", () => ({
  showNotification: (...args: unknown[]) => mockShowNotification(...args),
}));

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

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const LABELS_VALUE = {
  data: {
    data: {
      labels: [
        { label_id: 1, name: "Inbox" }, // special -> filtered out
        { label_id: 16, name: "Work" }, // custom
        { label_id: 32, name: "Personal" }, // custom
      ],
    },
  },
};

function renderMenu(mailOverrides: Record<string, unknown> = {}, extra = {}) {
  const { MessageMenu } = require("~/components/EveMail/MessageMenu");
  const mail = {
    mail_id: 100,
    is_read: false,
    labels: [16],
    ...mailOverrides,
  };
  return render(
    <MantineProvider>
      <MessageMenu characterId={123} mail={mail} {...extra} />
    </MantineProvider>,
  );
}

describe("MessageMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessToken.mockReturnValue({
      authHeaders: { Authorization: "Bearer test" },
    });
    mockUseCharacterMailLabels.mockReturnValue(LABELS_VALUE);
  });

  it("renders the menu trigger button", () => {
    const { container } = renderMenu();
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("shows non-special label items plus read/delete actions when opened", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Message Labels")).toBeInTheDocument();
    // mail has label 16 -> "Remove Work"; label 32 not present -> "Add Personal"
    expect(screen.getByText("Remove Work")).toBeInTheDocument();
    expect(screen.getByText("Add Personal")).toBeInTheDocument();
    // special label 1 (Inbox) is filtered out
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
    const body = (
      mockPutMail.mock.calls[0] as [number, number, { labels: number[] }]
    )[2];
    expect(body.labels).toEqual([]);
  });

  it("toggles read state via the ESI update when 'Mark as Read' is clicked", async () => {
    const user = userEvent.setup();
    const data = [{ mail_id: 100, is_read: false }];
    renderMenu({}, { data });
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Mark as Read"));

    expect(mockPutMail).toHaveBeenCalledTimes(1);
    const body = (
      mockPutMail.mock.calls[0] as [number, number, { read: boolean }]
    )[2];
    expect(body.read).toBe(true);
    expect(data[0]!.is_read).toBe(true);
  });

  it("opens a confirmation modal when 'Delete Message' is clicked", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Delete Message"));

    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as { title: string };
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
    // The modal is mocked; invoke the confirm callback directly.
    config.onConfirm();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockDeleteMail).toHaveBeenCalledWith(123, 100, expect.anything());
  });

  it("notifies an error instead of updating a label when mail_id is undefined", async () => {
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

  it("renders no label items when the labels hook returns no labels", async () => {
    const user = userEvent.setup();
    mockUseCharacterMailLabels.mockReturnValue({ data: { data: {} } });
    renderMenu();
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Message Labels")).toBeInTheDocument();
    expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Remove /)).not.toBeInTheDocument();
  });
});
