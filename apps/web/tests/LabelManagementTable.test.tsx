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

const mockUseCharacterMailLabels = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterMailLabels: (...args: unknown[]) =>
    mockUseCharacterMailLabels(...args),
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

// Local child components are exercised elsewhere — stub to readable text.
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
}));

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const deleteLabel = jest.fn<() => Promise<{ success: boolean; error?: string }>>(
  () => Promise.resolve({ success: true }),
);

const LABELS_VALUE = {
  data: {
    data: {
      labels: [
        { label_id: 1, name: "Inbox" }, // special
        { label_id: 16, name: "Work" }, // custom
        { label_id: 32, name: "Personal" }, // custom
      ],
    },
  },
  deleteLabel,
};

function renderTable(characterId = 42) {
  const {
    LabelManagementTable,
  } = require("~/components/EveMail/LabelManagementTable");
  return render(
    <MantineProvider>
      <LabelManagementTable characterId={characterId} />
    </MantineProvider>,
  );
}

describe("LabelManagementTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteLabel.mockResolvedValue({ success: true });
    mockUseCharacterMailLabels.mockReturnValue(LABELS_VALUE);
  });

  it("renders a row per label with its name", () => {
    renderTable();
    expect(screen.getByText("LabelName 1")).toBeInTheDocument();
    expect(screen.getByText("LabelName 16")).toBeInTheDocument();
    expect(screen.getByText("LabelName 32")).toBeInTheDocument();
  });

  it("only shows a Delete button for non-special labels", () => {
    renderTable();
    // labels 16 and 32 are custom -> 2 delete buttons; label 1 is special.
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  it("opens a confirm modal titled 'Delete Label' when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);

    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as { title: string };
    expect(config.title).toBe("Delete Label");
  });

  it("calls deleteLabel with the label id and notifies success when confirmed", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);

    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    config.onConfirm();
    await Promise.resolve();
    await Promise.resolve();

    expect(deleteLabel).toHaveBeenCalledWith(16);
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Label deleted" }),
    );
  });

  it("notifies an error when deleteLabel reports failure", async () => {
    const user = userEvent.setup();
    deleteLabel.mockResolvedValueOnce({ success: false, error: "boom" });
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

  it("renders an empty table body (no Delete buttons) when there are no labels", () => {
    mockUseCharacterMailLabels.mockReturnValue({ data: { data: {} }, deleteLabel });
    const { container } = renderTable();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
    // table shell still renders
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});
