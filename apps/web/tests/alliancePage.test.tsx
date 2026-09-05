import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
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
const mockGetAlliancesAllianceId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("next/navigation", () => ({
  useParams: () => ({ allianceId }),
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The server page imports the ESI client for generateMetadata; the coverage CI
// job runs install + test only (no `kubb:generate`), so stub the module out.
jest.mock("@jitaspace/esi-client", () => ({
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
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
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
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
    ).toHaveAttribute("href", "https://evemaps.dotlan.net/alliance/99000001");
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

describe("alliance page server wrapper", () => {
  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(id: string) {
    const Page = require("~/app/alliance/[allianceId]/page").default;
    const tree = Page({ params: Promise.resolve({ allianceId: id }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<unknown>;
  }

  it("renders the client page for a canonical id", async () => {
    await expect(runWrapper("99005338")).resolves.toBeTruthy();
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/alliance/099005338` used to serve the same alliance as `/alliance/99005338`.
    await expect(runWrapper("099005338")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("canonicalises onto the parsed id", async () => {
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: {
        name: "Pandemic Horde",
        ticker: "REKTD",
        date_founded: "2015-05-20T10:00:00Z",
      },
    });
    const { generateMetadata } =
      require("~/app/alliance/[allianceId]/page") as typeof import("~/app/alliance/[allianceId]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ allianceId: "99005338" }),
    });

    expect(metadata.alternates?.canonical).toBe("/alliance/99005338");
  });
});
