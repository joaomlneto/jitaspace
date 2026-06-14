import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// EveMailComposeForm is a normal form component (subject + recipients +
// rich-text body) that posts a new mail via ESI. We mock the data hooks, the
// ESI send call, the html->EVE-mail serialiser, the recipient multiselect
// (a controlled stub exposing a button that injects a recipient), and the
// rich-text editor. jest.mock is NOT auto-hoisted here, so the component is
// lazy-require()d inside each test AFTER the mocks are registered.
// ---------------------------------------------------------------------------

const mockUseSelectedCharacter = jest.fn();
const mockUseAccessToken = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: (...args: unknown[]) =>
    mockUseSelectedCharacter(...args),
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

const mockPostMail =
  jest.fn<() => Promise<{ status: number; data?: unknown }>>();

jest.mock("@jitaspace/esi-client", () => ({
  postCharactersCharacterIdMail: (...args: unknown[]) => mockPostMail(...args),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  htmlToEveMail: (html: string) => `eve:${html}`,
}));

// Controlled recipient multiselect stub: renders a button that injects a
// recipient id into the form, and surfaces the current value for assertions.
jest.mock("@jitaspace/ui", () => ({
  EmailRecipientSearchMultiSelect: ({
    value,
    onChange,
    error,
  }: {
    value?: string[];
    onChange?: (v: string[]) => void;
    error?: ReactNode;
  }) => (
    <div>
      <span data-testid="recipients-value">{(value ?? []).join(",")}</span>
      {error ? <span data-testid="recipients-error">{error}</span> : null}
      <button type="button" onClick={() => onChange?.(["123"])}>
        add-recipient
      </button>
    </div>
  ),
}));

// Rich-text editor stub: a button that pushes body content into the form.
jest.mock("~/components/EveMail/Editor/MailMessageEditor", () => ({
  MailMessageEditor: ({
    onContentUpdate,
  }: {
    onContentUpdate?: (content: string) => void;
  }) => (
    <button type="button" onClick={() => onContentUpdate?.("Hello body")}>
      set-body
    </button>
  ),
}));

const mockOpenConfirmModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openConfirmModal: (...args: unknown[]) => mockOpenConfirmModal(...args),
}));

const mockShowNotification = jest.fn();
jest.mock("@mantine/notifications", () => ({
  showNotification: (...args: unknown[]) => mockShowNotification(...args),
}));

function renderForm(onSend?: () => void) {
  const {
    EveMailComposeForm,
  } = require("~/components/EveMail/EveMailComposeForm");
  render(
    <MantineProvider>
      <EveMailComposeForm onSend={onSend} />
    </MantineProvider>,
  );
}

describe("EveMailComposeForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: { Authorization: "Bearer test" },
    });
    mockPostMail.mockResolvedValue({ status: 201 });
  });

  it("renders the subject input, send button, recipients and editor", () => {
    renderForm();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByText("add-recipient")).toBeInTheDocument();
    expect(screen.getByText("set-body")).toBeInTheDocument();
  });

  it("does not call ESI when submitting with no recipients/subject (validation fails)", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(mockPostMail).not.toHaveBeenCalled();
    expect(
      screen.getByText("At least one recipient is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("Subject is required")).toBeInTheDocument();
  });

  it("sends the mail via ESI and calls onSend on success", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    renderForm(onSend);

    await user.type(screen.getByLabelText("Subject"), "Greetings");
    await user.click(screen.getByText("add-recipient"));
    await user.click(screen.getByText("set-body"));
    // recipient injected into form state
    expect(screen.getByTestId("recipients-value")).toHaveTextContent("123");

    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockPostMail).toHaveBeenCalledTimes(1));
    const [charId, body, headers] = mockPostMail.mock.calls[0] as [
      number,
      {
        approved_cost: number;
        body: string;
        recipients: { recipient_id: number; recipient_type: string }[];
        subject: string;
      },
      unknown,
    ];
    expect(charId).toBe(123);
    expect(body.subject).toBe("Greetings");
    expect(body.approved_cost).toBe(0);
    expect(body.body).toBe("eve:Hello body");
    expect(body.recipients).toEqual([
      { recipient_id: 123, recipient_type: "character" },
    ]);
    expect(headers).toEqual({ Authorization: "Bearer test" });

    await waitFor(() =>
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Message sent" }),
      ),
    );
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("notifies a failure when ESI responds with a non-created status", async () => {
    const user = userEvent.setup();
    mockPostMail.mockResolvedValue({ status: 520 });
    renderForm();

    await user.type(screen.getByLabelText("Subject"), "Subj");
    await user.click(screen.getByText("add-recipient"));
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Failed to send message" }),
      ),
    );
  });

  it("opens the CSPA confirmation modal when ESI rejects with ContactCostNotApproved", async () => {
    const user = userEvent.setup();
    mockPostMail.mockRejectedValue({
      response: {
        data: {
          error: 'ContactCostNotApproved {"totalCost": 1500}',
        },
      },
    });
    renderForm();

    await user.type(screen.getByLabelText("Subject"), "Subj");
    await user.click(screen.getByText("add-recipient"));
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1));
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      title: string;
      labels: { confirm: string };
    };
    expect(config.title).toBe("Insufficient CSPA");
    expect(config.labels.confirm).toContain("1500");
  });

  it("notifies a not-logged-in error when there is no access token", async () => {
    const user = userEvent.setup();
    mockUseAccessToken.mockReturnValue({ accessToken: null, authHeaders: {} });
    renderForm();

    await user.type(screen.getByLabelText("Subject"), "Subj");
    await user.click(screen.getByText("add-recipient"));
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Not logged in" }),
      ),
    );
    expect(mockPostMail).not.toHaveBeenCalled();
  });
});
