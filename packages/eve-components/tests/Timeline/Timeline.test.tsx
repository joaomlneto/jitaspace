import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

// AllianceAvatar is a pure leaf living in @jitaspace/ui; AllianceName is a
// moved smart leaf in this package (../Text). Stub each at its real source.
jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<typeof import("@jitaspace/ui")>("@jitaspace/ui"),
  AllianceAvatar: ({ allianceId }: { allianceId?: number }) => (
    <span data-testid="alliance-avatar" data-alliance-id={String(allianceId)}>
      {`Avatar ${allianceId}`}
    </span>
  ),
}));

jest.mock("../../Text", () => ({
  AllianceName: ({ allianceId }: { allianceId?: number }) => (
    <span data-testid="alliance-name">{`Alliance ${allianceId}`}</span>
  ),
}));

const { CorporationAllianceHistoryTimeline } =
  require("../../Timeline/CorporationAllianceHistoryTimeline") as typeof import("../../Timeline/CorporationAllianceHistoryTimeline");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("CorporationAllianceHistoryTimeline", () => {
  it("renders nothing when no history is provided", () => {
    const { container } = renderWithMantine(
      <CorporationAllianceHistoryTimeline />,
    );
    expect(screen.queryByTestId("alliance-name")).not.toBeInTheDocument();
    // The Timeline shell renders but has no items
    expect(container.querySelectorAll(".mantine-Timeline-item")).toHaveLength(
      0,
    );
  });

  it("renders nothing when history is an empty array", () => {
    const { container } = renderWithMantine(
      <CorporationAllianceHistoryTimeline history={[]} />,
    );
    expect(container.querySelectorAll(".mantine-Timeline-item")).toHaveLength(
      0,
    );
  });

  it("renders an alliance membership entry with a link and 'Since' label", () => {
    renderWithMantine(
      <CorporationAllianceHistoryTimeline
        history={[
          {
            record_id: 1,
            alliance_id: 99000001,
            start_date: "2020-05-01T12:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByTestId("alliance-name")).toHaveTextContent(
      "Alliance 99000001",
    );
    // Single entry with an alliance has no end_date -> "Since"
    expect(screen.getByText(/Since/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Alliance 99000001" }),
    ).toHaveAttribute("href", "/alliance/99000001");
  });

  it("renders a 'Corporation Founded' entry for a membership with no alliance", () => {
    renderWithMantine(
      <CorporationAllianceHistoryTimeline
        history={[
          {
            record_id: 1,
            start_date: "2018-01-01T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("Corporation Founded")).toBeInTheDocument();
    // No-alliance entries use the "On" label
    expect(screen.getByText(/On/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a 'Closed' badge for a deleted alliance membership", () => {
    renderWithMantine(
      <CorporationAllianceHistoryTimeline
        history={[
          {
            record_id: 1,
            alliance_id: 99000001,
            is_deleted: true,
            start_date: "2019-06-15T08:30:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("computes a 'From … to …' range when a membership follows a gap entry", () => {
    // index 0: no alliance (a gap), index 1: alliance membership.
    // The membership at index 1 has alliance_id and the previous entry has no
    // alliance_id, so it gets an end_date equal to the previous start_date,
    // and is rendered with a "From … to …" range.
    renderWithMantine(
      <CorporationAllianceHistoryTimeline
        history={[
          {
            record_id: 1,
            start_date: "2021-03-01T00:00:00Z",
          },
          {
            record_id: 2,
            alliance_id: 99000002,
            start_date: "2021-01-01T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByText(/From/)).toBeInTheDocument();
    expect(screen.getByText(/to/)).toBeInTheDocument();
    expect(screen.getByTestId("alliance-name")).toHaveTextContent(
      "Alliance 99000002",
    );
  });

  it("orders entries by record_id descending", () => {
    renderWithMantine(
      <CorporationAllianceHistoryTimeline
        history={[
          {
            record_id: 1,
            alliance_id: 99000001,
            start_date: "2015-01-01T00:00:00Z",
          },
          {
            record_id: 2,
            alliance_id: 99000002,
            start_date: "2016-01-01T00:00:00Z",
          },
        ]}
      />,
    );
    const names = screen
      .getAllByTestId("alliance-name")
      .map((n) => n.textContent);
    // Highest record_id (99000002) should come first
    expect(names[0]).toBe("Alliance 99000002");
    expect(names[1]).toBe("Alliance 99000001");
  });
});
