import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { format } from "date-fns";

const FOUNDED_AT = "2004-03-15T14:33:00Z";
// date-fns formats in the local timezone; compute the expected string the same way
const EXPECTED_FOUNDED = format(new Date(FOUNDED_AT), "yyyy-MM-dd HH:mm");

let allianceId = "99000001";

const mockUseEsiAllianceInformation = jest.fn();
const mockUseEsiAllianceMemberCorporations = jest.fn();
const mockUseSelectedCharacter = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ allianceId }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (id: number) => mockUseEsiAllianceInformation(id),
  useEsiAllianceMemberCorporations: (id: number) =>
    mockUseEsiAllianceMemberCorporations(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: () => null,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string | object; children?: ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

function renderPage() {
  const Page = require("~/app/alliance/[allianceId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("alliance page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    allianceId = "99000001";
  });

  it("renders all sections with rich alliance data", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    mockUseEsiAllianceInformation.mockReturnValue({
      data: {
        data: {
          ticker: "TEST",
          creator_id: 540496093,
          creator_corporation_id: 98000001,
          executor_corporation_id: 98000002,
          date_founded: FOUNDED_AT,
          faction_id: 500001,
        },
      },
    });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({
      data: { data: [98000001, 98000002, 98000003] },
    });

    renderPage();

    expect(screen.getByText("TEST")).toBeInTheDocument();
    // "Creator" appears as both a label and a member-corporation badge
    expect(screen.getAllByText("Creator").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Creator Corporation")).toBeInTheDocument();
    // "Executor" appears as both a label and a member-corporation badge
    expect(screen.getAllByText("Executor").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Founded on")).toBeInTheDocument();
    expect(screen.getByText(EXPECTED_FOUNDED)).toBeInTheDocument();
    expect(screen.getByText("Factional Warfare")).toBeInTheDocument();
    expect(screen.getByText("Member Corporations")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "DOTLAN EveMaps" }),
    ).toHaveAttribute(
      "href",
      "https://evemaps.dotlan.net/alliance/99000001",
    );
  });

  it("hides optional sections when data is sparse and no character is selected", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseEsiAllianceInformation.mockReturnValue({ data: undefined });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({ data: undefined });

    renderPage();

    // base sections always present
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Member Corporations")).toBeInTheDocument();
    // optional sections gated on optional fields are absent
    expect(screen.queryByText("Executor")).not.toBeInTheDocument();
    expect(screen.queryByText("Founded on")).not.toBeInTheDocument();
    expect(screen.queryByText("Factional Warfare")).not.toBeInTheDocument();
  });

  it("returns null when the alliance id is not finite", () => {
    allianceId = "not-a-number";
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseEsiAllianceInformation.mockReturnValue({ data: undefined });
    mockUseEsiAllianceMemberCorporations.mockReturnValue({ data: undefined });

    renderPage();
    // page returns null -> none of its content is rendered
    expect(screen.queryByText("Member Corporations")).not.toBeInTheDocument();
    expect(screen.queryByText("Creator")).not.toBeInTheDocument();
  });
});
