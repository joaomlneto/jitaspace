import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Capture the confirm-modal config so we can drive onConfirm manually.
const mockOpenConfirmModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openConfirmModal: (...args: unknown[]) => mockOpenConfirmModal(...args),
}));

// Make the "random" colour deterministic for MailLabelColorSelect.
const mockGetRandomArrayEntry = jest.fn();
jest.mock("@jitaspace/utils", () => ({
  getRandomArrayEntry: (...args: unknown[]) => mockGetRandomArrayEntry(...args),
}));

const {
  CalendarEventAttendanceSelect,
} = require("../../Select/CalendarEventAttendanceSelect") as typeof import("../../Select/CalendarEventAttendanceSelect");
const {
  MailLabelColorSelect,
} = require("../../Select/MailLabelColorSelect") as typeof import("../../Select/MailLabelColorSelect");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// ---------------------------------------------------------------------------
// CalendarEventAttendanceSelect
// ---------------------------------------------------------------------------
describe("CalendarEventAttendanceSelect", () => {
  beforeEach(() => {
    mockOpenConfirmModal.mockReset();
  });

  it("renders the 'Not responded' placeholder by default", () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond />);
    expect(
      screen.getByPlaceholderText("Not responded"),
    ).toBeInTheDocument();
  });

  it("renders the formatted response options in the dropdown", async () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond />);
    await userEvent.click(screen.getByRole("textbox"));
    // Underscored values are humanised: not_responded -> "Not responded"
    expect(
      screen.getByRole("option", { name: "Accepted", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Declined", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Not responded", hidden: true }),
    ).toBeInTheDocument();
  });

  it("reflects the initialResponse value in the input", () => {
    renderWithMantine(
      <CalendarEventAttendanceSelect canRespond initialResponse="accepted" />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Accepted");
  });

  it("opens a confirmation modal when a new response is selected", async () => {
    renderWithMantine(
      <CalendarEventAttendanceSelect canRespond eventTitle="Fleet Op" />,
    );
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.click(
      screen.getByRole("option", { name: "Accepted", hidden: true }),
    );

    expect(mockOpenConfirmModal).toHaveBeenCalledTimes(1);
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      title: string;
      children: string;
    };
    expect(config.title).toBe("Are you sure?");
    expect(config.children).toContain("Fleet Op");
    expect(config.children).toContain("accepted");
  });

  it("invokes onRespond with the chosen response once the modal is confirmed", async () => {
    const onRespond = jest.fn();
    renderWithMantine(
      <CalendarEventAttendanceSelect canRespond onRespond={onRespond} />,
    );
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.click(
      screen.getByRole("option", { name: "Declined", hidden: true }),
    );

    // The callback only fires once the user confirms the modal.
    expect(onRespond).not.toHaveBeenCalled();
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    act(() => {
      config.onConfirm();
    });

    expect(onRespond).toHaveBeenCalledWith("declined");
  });

  it("reflects the confirmed response in the input value", async () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.click(
      screen.getByRole("option", { name: "Tentative", hidden: true }),
    );

    // Value is committed only after confirming. onConfirm triggers a state
    // update, so run it inside act() to flush React.
    const config = mockOpenConfirmModal.mock.calls[0]![0] as {
      onConfirm: () => void;
    };
    act(() => {
      config.onConfirm();
    });

    expect(screen.getByRole("textbox")).toHaveValue("Tentative");
  });

  it("does not open a confirmation modal when responses are read-only", async () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond={false} />);
    const input = screen.getByRole("textbox");
    // A read-only Select does not open its dropdown
    await userEvent.click(input);
    expect(input).toHaveAttribute("readonly");
    expect(mockOpenConfirmModal).not.toHaveBeenCalled();
  });

  it("shows a loader in the right section while loading", () => {
    const { container } = renderWithMantine(
      <CalendarEventAttendanceSelect canRespond isLoading />,
    );
    expect(container.querySelector(".mantine-Loader-root")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MailLabelColorSelect
// ---------------------------------------------------------------------------
describe("MailLabelColorSelect", () => {
  beforeEach(() => {
    mockGetRandomArrayEntry.mockReset();
    mockGetRandomArrayEntry.mockReturnValue("#ff6600");
  });

  it("renders a colour input seeded with a random swatch", () => {
    renderWithMantine(<MailLabelColorSelect />);
    // The initial value comes from the (mocked) random helper
    expect(screen.getByRole("textbox")).toHaveValue("#ff6600");
    expect(mockGetRandomArrayEntry).toHaveBeenCalled();
  });

  it("honours a controlled value over the random seed", () => {
    renderWithMantine(<MailLabelColorSelect value="#0099ff" />);
    expect(screen.getByRole("textbox")).toHaveValue("#0099ff");
  });

  it("picks a new random colour and calls onChange when refresh is clicked", async () => {
    const onChange = jest.fn();
    mockGetRandomArrayEntry
      .mockReturnValueOnce("#000000") // initial seed
      .mockReturnValueOnce("#9a0000"); // refresh click
    renderWithMantine(<MailLabelColorSelect onChange={onChange} />);

    // The refresh button is the only button rendered in the right section
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("#9a0000");
  });

  it("calls onChange when the colour value changes directly", () => {
    const onChange = jest.fn();
    renderWithMantine(<MailLabelColorSelect onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "#01ffff" },
    });
    expect(onChange).toHaveBeenCalledWith("#01ffff");
  });

  it("updates its own value when uncontrolled and the input changes", () => {
    // No caller onChange / value: the component's internal handler manages state.
    renderWithMantine(<MailLabelColorSelect />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "#349800" } });
    expect(input).toHaveValue("#349800");
  });

  it("seeds the refresh-able value when no value prop is given", async () => {
    // Refresh without a controlled value falls back to internal state updates.
    mockGetRandomArrayEntry
      .mockReturnValueOnce("#111111")
      .mockReturnValueOnce("#ffff01");
    renderWithMantine(<MailLabelColorSelect />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("textbox")).toHaveValue("#ffff01");
  });
});
