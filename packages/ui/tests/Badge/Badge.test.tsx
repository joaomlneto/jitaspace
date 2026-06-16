import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// Every Badge in packages/ui/Badge is a "dumb" presentational component: it
// takes its value directly via props (ticker / response / standing /
// securityStatus / labelName) and renders a Mantine <Badge>, falling back to a
// <Skeleton> placeholder when the value is missing. No hooks are involved, so
// these tests render with real props and assert on the rendered text.

import { AllianceTickerBadge } from "../../Badge/AllianceTickerBadge";
import { CalendarEventResponseBadge } from "../../Badge/CalendarEventResponseBadge";
import { CorporationTickerBadge } from "../../Badge/CorporationTickerBadge";
import { MailLabelBadge } from "../../Badge/MailLabelBadge";
import { SolarSystemSecurityStatusBadge } from "../../Badge/SolarSystemSecurityStatusBadge";
import { StandingsBadge } from "../../Badge/StandingsBadge";
import { WarAggressorTickerBadge } from "../../Badge/WarAggressorTickerBadge";
import { WarDefenderTickerBadge } from "../../Badge/WarDefenderTickerBadge";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("Ticker badges (Alliance / Corporation / WarAggressor / WarDefender)", () => {
  it.each<[string, (ticker?: string) => ReactElement]>([
    [
      "AllianceTickerBadge",
      (ticker) => <AllianceTickerBadge ticker={ticker} />,
    ],
    [
      "CorporationTickerBadge",
      (ticker) => <CorporationTickerBadge ticker={ticker} />,
    ],
    [
      "WarAggressorTickerBadge",
      (ticker) => <WarAggressorTickerBadge ticker={ticker} />,
    ],
    [
      "WarDefenderTickerBadge",
      (ticker) => <WarDefenderTickerBadge ticker={ticker} />,
    ],
  ])("%s renders the provided ticker", (_label, make) => {
    renderWithMantine(make("ABCDE"));
    expect(screen.getByText("ABCDE")).toBeInTheDocument();
  });

  it.each<[string, (ticker?: string) => ReactElement]>([
    [
      "AllianceTickerBadge",
      (ticker) => <AllianceTickerBadge ticker={ticker} />,
    ],
    [
      "CorporationTickerBadge",
      (ticker) => <CorporationTickerBadge ticker={ticker} />,
    ],
    [
      "WarAggressorTickerBadge",
      (ticker) => <WarAggressorTickerBadge ticker={ticker} />,
    ],
    [
      "WarDefenderTickerBadge",
      (ticker) => <WarDefenderTickerBadge ticker={ticker} />,
    ],
  ])(
    "%s renders a skeleton placeholder when ticker is missing",
    (_label, make) => {
      const { container } = renderWithMantine(make(undefined));
      // Placeholder badge text used inside the skeleton.
      expect(screen.getByText("XXXXX")).toBeInTheDocument();
      expect(container.querySelector(".mantine-Skeleton-root")).toBeTruthy();
    },
  );
});

describe("CalendarEventResponseBadge", () => {
  it.each<["accepted" | "tentative" | "not_responded" | "declined", string]>([
    ["accepted", "accepted"],
    ["tentative", "tentative"],
    ["declined", "declined"],
  ])("renders the %s response label", (response, expected) => {
    renderWithMantine(<CalendarEventResponseBadge response={response} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("replaces the underscore in not_responded with a space", () => {
    renderWithMantine(<CalendarEventResponseBadge response="not_responded" />);
    expect(screen.getByText("not responded")).toBeInTheDocument();
  });

  it("renders a skeleton placeholder when response is missing", () => {
    const { container } = renderWithMantine(<CalendarEventResponseBadge />);
    expect(screen.getByText("Something")).toBeInTheDocument();
    expect(container.querySelector(".mantine-Skeleton-root")).toBeTruthy();
  });
});

describe("MailLabelBadge", () => {
  it("renders the provided label name", () => {
    renderWithMantine(<MailLabelBadge labelName="Inbox" />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("renders without a label name without crashing", () => {
    const { container } = renderWithMantine(<MailLabelBadge />);
    expect(container.querySelector(".mantine-Badge-root")).toBeTruthy();
  });
});

describe("SolarSystemSecurityStatusBadge", () => {
  it.each<[number, string]>([
    [1.0, "1.0"],
    [0.95, "1.0"],
    [0.84, "0.8"],
    [0.5, "0.5"],
    [0.34, "0.3"],
    [0.1, "0.1"],
    [0, "0.0"],
    [-0.4, "0.0"], // negative is clamped to 0 before rounding
  ])("renders rounded security status %p as %s", (securityStatus, expected) => {
    renderWithMantine(
      <SolarSystemSecurityStatusBadge securityStatus={securityStatus} />,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders a skeleton placeholder when security status is undefined", () => {
    const { container } = renderWithMantine(<SolarSystemSecurityStatusBadge />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
    expect(container.querySelector(".mantine-Skeleton-root")).toBeTruthy();
  });
});

describe("StandingsBadge", () => {
  it.each<[number, string]>([
    [10, "10.0"], // > 5 -> darkblue
    [3, "3.0"], // > 0 -> lightblue
    [0, "0.0"], // == 0 -> gray
    [-3, "-3.0"], // >= -5 -> orange
    [-8, "-8.0"], // < -5 -> red
  ])("renders rounded standing %p as %s", (standing, expected) => {
    renderWithMantine(<StandingsBadge standing={standing} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders a skeleton placeholder when standing is undefined", () => {
    const { container } = renderWithMantine(<StandingsBadge />);
    expect(screen.getByText("xxx")).toBeInTheDocument();
    expect(container.querySelector(".mantine-Skeleton-root")).toBeTruthy();
  });
});
