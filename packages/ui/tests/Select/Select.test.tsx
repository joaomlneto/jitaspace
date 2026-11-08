import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type * as CalendarEventAttendanceSelectModule from "../../Select/CalendarEventAttendanceSelect";
import type * as MailLabelColorSelectModule from "../../Select/MailLabelColorSelect";

// Make the "random" colour deterministic for MailLabelColorSelect.
const mockGetRandomArrayEntry = jest.fn();
jest.mock("@jitaspace/utils", () => ({
  getRandomArrayEntry: (...args: unknown[]) => mockGetRandomArrayEntry(...args),
}));

const { CalendarEventAttendanceSelect } =
  require("../../Select/CalendarEventAttendanceSelect") as typeof CalendarEventAttendanceSelectModule;
const { MailLabelColorSelect } =
  require("../../Select/MailLabelColorSelect") as typeof MailLabelColorSelectModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// ---------------------------------------------------------------------------
// CalendarEventAttendanceSelect
// ---------------------------------------------------------------------------
describe("CalendarEventAttendanceSelect", () => {
  /** Opens the dropdown and picks `label`. */
  const pick = async (label: string) => {
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(
      screen.getByRole("option", { name: label, hidden: true }),
    );
  };

  it("renders the 'Not responded' placeholder by default", () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond />);
    expect(screen.getByPlaceholderText("Not responded")).toBeInTheDocument();
  });

  it("renders the formatted response options in the dropdown", async () => {
    renderWithMantine(<CalendarEventAttendanceSelect canRespond />);
    await userEvent.click(screen.getByRole("combobox"));
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
    expect(screen.getByRole("combobox")).toHaveValue("Accepted");
  });

  it("applies a pick at once when no confirmation is asked for", async () => {
    const onRespond = jest.fn();
    renderWithMantine(
      <CalendarEventAttendanceSelect canRespond onRespond={onRespond} />,
    );
    await pick("Declined");
    expect(onRespond).toHaveBeenCalledWith("declined");
    expect(screen.getByRole("combobox")).toHaveValue("Declined");
  });

  it("asks confirmResponse first, and applies only once it calls apply", async () => {
    const onRespond = jest.fn();
    const confirmResponse =
      jest.fn<(response: string, apply: () => void) => void>();
    renderWithMantine(
      <CalendarEventAttendanceSelect
        canRespond
        confirmResponse={confirmResponse}
        onRespond={onRespond}
      />,
    );
    await pick("Tentative");

    expect(confirmResponse).toHaveBeenCalledTimes(1);
    expect(confirmResponse.mock.calls[0]?.[0]).toBe("tentative");
    expect(onRespond).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).not.toHaveValue("Tentative");

    act(() => confirmResponse.mock.calls[0]?.[1]());

    expect(onRespond).toHaveBeenCalledWith("tentative");
    expect(screen.getByRole("combobox")).toHaveValue("Tentative");
  });

  it("leaves the response as it was when confirmation never applies", async () => {
    const onRespond = jest.fn();
    renderWithMantine(
      <CalendarEventAttendanceSelect
        canRespond
        initialResponse="accepted"
        confirmResponse={() => undefined}
        onRespond={onRespond}
      />,
    );
    await pick("Declined");
    expect(onRespond).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveValue("Accepted");
  });

  it("does not respond when responses are read-only", async () => {
    const confirmResponse = jest.fn();
    renderWithMantine(
      <CalendarEventAttendanceSelect
        canRespond={false}
        confirmResponse={confirmResponse}
      />,
    );
    const input = screen.getByRole("combobox");
    // A read-only Select does not open its dropdown
    await userEvent.click(input);
    expect(input).toHaveAttribute("readonly");
    expect(confirmResponse).not.toHaveBeenCalled();
  });

  it("shows a loader in the right section while loading", () => {
    const { container } = renderWithMantine(
      <CalendarEventAttendanceSelect canRespond isLoading />,
    );
    expect(container.querySelector(".mantine-Loader-root")).toBeInTheDocument();
  });

  it("does not let a caller-supplied onChange bypass the confirmation", async () => {
    // Regression: otherProps is spread BEFORE the internal onChange, so a
    // caller's onChange cannot override the confirmation logic.
    const callerOnChange = jest.fn();
    const confirmResponse =
      jest.fn<(response: string, apply: () => void) => void>();
    renderWithMantine(
      <CalendarEventAttendanceSelect
        canRespond
        confirmResponse={confirmResponse}
        onChange={callerOnChange}
      />,
    );
    await pick("Accepted");
    expect(confirmResponse).toHaveBeenCalledTimes(1);
    expect(callerOnChange).not.toHaveBeenCalled();
    act(() => confirmResponse.mock.calls[0]?.[1]());
    expect(callerOnChange).toHaveBeenCalledWith("accepted", expect.anything());
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
