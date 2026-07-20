import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// ManageMailLabelsModal renders the existing-labels table plus a "create new
// label" form. We mock its data hooks + ESI call, the heavy LabelManagementTable
// child, and the ui color select. jest.mock is NOT auto-hoisted here, so the
// modal is lazy-require()d inside each test AFTER the mocks are registered.
// ---------------------------------------------------------------------------

const mockUseSelectedCharacter = jest.fn();
const mockUseAccessToken = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: (...args: unknown[]) =>
    mockUseSelectedCharacter(...args),
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
}));

const mockPostLabel =
  jest.fn<() => Promise<{ status: number; data?: unknown }>>();

jest.mock("@jitaspace/esi-client", () => ({
  postCharactersCharacterIdMailLabels: (...args: unknown[]) =>
    mockPostLabel(...args),
  // The component reads keys off this enum object via randomProperty.
  postCharactersCharacterIdMailLabelsMutationRequestColorEnum: {
    blue: "#0000fe",
    green: "#006634",
  },
}));

// randomProperty must return a real value so the form has a valid initial color.
jest.mock("@jitaspace/utils", () => ({
  randomProperty: (obj: Record<string, unknown>) => Object.values(obj)[0],
}));

jest.mock("@jitaspace/ui", () => ({
  MailLabelColorSelect: ({ label }: { label?: string }) => (
    <div data-testid="color-select">{label}</div>
  ),
}));

// Heavy child that fetches/lists labels — stub it out.
jest.mock("~/components/EveMail", () => ({
  LabelManagementTable: ({ characterId }: { characterId?: number }) => (
    <div data-testid="label-management-table">{`labels-for-${characterId}`}</div>
  ),
}));

const mockShowNotification = jest.fn();
jest.mock("@mantine/notifications", () => ({
  showNotification: (...args: unknown[]) => mockShowNotification(...args),
}));

function renderModal(closeModal = jest.fn()) {
  const {
    ManageMailLabelsModal,
  } = require("~/components/Modals/ManageMailLabelsModal");
  render(
    <MantineProvider>
      <ManageMailLabelsModal
        context={{ closeModal } as never}
        id="manage-labels"
        innerProps={{}}
      />
    </MantineProvider>,
  );
  return { closeModal };
}

describe("ManageMailLabelsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseAccessToken.mockReturnValue({
      accessToken: "token",
      authHeaders: { Authorization: "Bearer test" },
    });
    mockPostLabel.mockResolvedValue({ status: 201 });
  });

  it("renders the create-label form and the existing-labels table", () => {
    renderModal();
    expect(screen.getByText("Create New Label")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByTestId("color-select")).toBeInTheDocument();
    // table receives the selected character id
    expect(screen.getByTestId("label-management-table")).toHaveTextContent(
      "labels-for-123",
    );
  });

  it("does not render the labels table when no character is selected", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    renderModal();
    // Form still renders, but the per-character table does not.
    expect(screen.getByText("Create New Label")).toBeInTheDocument();
    expect(
      screen.queryByTestId("label-management-table"),
    ).not.toBeInTheDocument();
  });

  it("creates a label and closes the modal on success", async () => {
    const user = userEvent.setup();
    const { closeModal } = renderModal();

    await user.type(screen.getByRole("textbox"), "My Label");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mockPostLabel).toHaveBeenCalledTimes(1);
    const [charId, body] = mockPostLabel.mock.calls[0] as [
      number,
      { name: string; color: string },
    ];
    expect(charId).toBe(123);
    expect(body.name).toBe("My Label");
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Label created" }),
    );
    expect(closeModal).toHaveBeenCalledWith("manage-labels");
  });

  it("blocks submission and shows a validation error for an empty name", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByText("Name cannot be empty")).toBeInTheDocument();
    expect(mockPostLabel).not.toHaveBeenCalled();
  });

  it("notifies an error when the create request reports a non-2xx status", async () => {
    const user = userEvent.setup();
    mockPostLabel.mockResolvedValue({ status: 400, data: "bad request" });
    const { closeModal } = renderModal();

    await user.type(screen.getByRole("textbox"), "Oops");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error creating label" }),
    );
    expect(closeModal).not.toHaveBeenCalled();
  });

  it("notifies a not-logged-in error when there is no access token", async () => {
    const user = userEvent.setup();
    mockUseAccessToken.mockReturnValue({
      accessToken: null,
      authHeaders: {},
    });
    renderModal();

    await user.type(screen.getByRole("textbox"), "Anything");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(mockPostLabel).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Not logged in"),
      }),
    );
  });
});
