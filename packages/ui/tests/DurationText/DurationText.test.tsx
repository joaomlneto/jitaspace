import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { CalendarEventHumanDurationText } from "../../DurationText/CalendarEventHumanDurationText";
import { HumanDurationText } from "../../DurationText/HumanDurationText";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("HumanDurationText", () => {
  it("humanizes a duration in milliseconds", () => {
    // 90 minutes = 5,400,000 ms -> "1 hour, 30 minutes"
    renderWithMantine(<HumanDurationText duration={90 * 60 * 1000} />);
    expect(screen.getByText("1 hour, 30 minutes")).toBeInTheDocument();
  });

  it("renders a zero duration", () => {
    renderWithMantine(<HumanDurationText duration={0} />);
    expect(screen.getByText("0 seconds")).toBeInTheDocument();
  });

  it("honours humanize-duration options (units/round)", () => {
    renderWithMantine(
      <HumanDurationText
        duration={90 * 60 * 1000}
        options={{ units: ["h"], round: true }}
      />,
    );
    // Restricted to hours and rounded -> "2 hours"
    expect(screen.getByText("2 hours")).toBeInTheDocument();
  });

  it("forwards Text props (e.g. data attributes survive)", () => {
    renderWithMantine(
      <HumanDurationText duration={1000} data-testid="duration" />,
    );
    expect(screen.getByTestId("duration")).toHaveTextContent("1 second");
  });
});

describe("CalendarEventHumanDurationText", () => {
  it("renders a loading skeleton when durationMs is undefined", () => {
    renderWithMantine(<CalendarEventHumanDurationText />);
    // The skeleton wraps a hidden "Loading..." placeholder
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows a friendly message for a zero duration", () => {
    renderWithMantine(<CalendarEventHumanDurationText durationMs={0} />);
    expect(screen.getByText("No duration specified")).toBeInTheDocument();
  });

  it("delegates to HumanDurationText for a non-zero duration", () => {
    renderWithMantine(
      <CalendarEventHumanDurationText durationMs={2 * 60 * 60 * 1000} />,
    );
    expect(screen.getByText("2 hours")).toBeInTheDocument();
  });

  it("passes humanize options through to the underlying text", () => {
    renderWithMantine(
      <CalendarEventHumanDurationText
        durationMs={90 * 60 * 1000}
        options={{ units: ["m"], round: true }}
      />,
    );
    expect(screen.getByText("90 minutes")).toBeInTheDocument();
  });

  it("forwards Text props for the zero-duration branch", () => {
    renderWithMantine(
      <CalendarEventHumanDurationText durationMs={0} data-testid="zero" />,
    );
    expect(screen.getByTestId("zero")).toHaveTextContent(
      "No duration specified",
    );
  });
});
