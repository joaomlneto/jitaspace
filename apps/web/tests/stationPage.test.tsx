import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { StationPageProps } from "~/app/station/[stationId]/page.client";

const mockUseStation = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const stationFindUnique =
  jest.fn<(a?: unknown) => Promise<Record<string, unknown> | null>>();

// Next's notFound() throws; mirror that so "was it called" is observable.
const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => notFound(),
}));

jest.mock("~/lib/db", () => ({
  prisma: { station: { findUnique: (a?: unknown) => stationFindUnique(a) } },
}));

jest.mock("@jitaspace/hooks", () => ({
  useStation: (id: number) => mockUseStation(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => null,
}));

jest.mock("~/components/Avatar", () => ({
  StationAvatar: () => <div>Station Avatar</div>,
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <div>Security Badge</div>,
}));

jest.mock("~/components/Text", () => ({
  RaceName: () => <span>Race Name</span>,
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

const JITA_44: StationPageProps = {
  stationId: 60003760,
  name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
  solarSystemId: 30000142,
  typeId: 1529,
  raceId: 1,
  ownerId: 1000035,
};

function renderPage(props: StationPageProps = JITA_44) {
  const Page = require("~/app/station/[stationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page {...props} />
    </MantineProvider>,
  );
}

describe("station page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stationFindUnique.mockReset();
  });

  it("renders the server-read station before ESI answers", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    mockUseStation.mockReturnValue({ data: undefined });

    renderPage();

    // The whole point of the server read: the name and the outgoing links are
    // in the DOM with no ESI response at all, which is what a crawler gets.
    expect(
      screen.getByText("Jita IV - Moon 4 - Caldari Navy Assembly Plant"),
    ).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/system/30000142");
    expect(hrefs).toContain("/type/1529");
    expect(hrefs).toContain("https://evemaps.dotlan.net/station/60003760");

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Station Type")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("prefers ESI over the server-read row once it resolves", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({
      data: {
        data: {
          name: "Jita IV - Moon 4 - Renamed Assembly Plant",
          system_id: 30000143,
          type_id: 1530,
          race_id: 2,
          owner: 1000036,
        },
      },
    });

    renderPage();

    expect(
      screen.getByText("Jita IV - Moon 4 - Renamed Assembly Plant"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Jita IV - Moon 4 - Caldari Navy Assembly Plant"),
    ).not.toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/system/30000143");
    expect(hrefs).toContain("/type/1530");
  });

  it("renders the columns the SDE leaves null without an undefined link", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({ data: undefined });

    renderPage({
      ...JITA_44,
      solarSystemId: null,
      raceId: null,
      ownerId: null,
    });

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs.some((href) => href?.includes("undefined"))).toBe(false);
  });
});

// `Page` returns <Suspense> wrapping the async <PageContent>, which is where
// `await params` and the database read happen. jsdom's renderer will not await
// an async component, so pull the inner element out and invoke it directly
// (the same approach tests/racePage.test.tsx uses).
async function resolvePageContent(stationId: string) {
  const Page = require("~/app/station/[stationId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ stationId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("station page server read", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stationFindUnique.mockReset();
  });

  it("server-renders the station name for a real station", async () => {
    stationFindUnique.mockResolvedValue({
      name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      solarSystemId: 30000142,
      typeId: 1529,
      raceId: 1,
      ownerId: 1000035,
    });
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({ data: undefined });

    const tree = await resolvePageContent("60003760");
    render(<MantineProvider>{tree}</MantineProvider>);

    expect(
      screen.getByText("Jita IV - Moon 4 - Caldari Navy Assembly Plant"),
    ).toBeInTheDocument();
  });

  it("404s for a station id no row matches", async () => {
    stationFindUnique.mockResolvedValue(null);

    await expect(resolvePageContent("999999999")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it.each(["0", "060003760", "60003760.0", "bad", ""])(
    "404s rather than serving a second URL for %p",
    async (stationId) => {
      await expect(resolvePageContent(stationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(stationFindUnique).not.toHaveBeenCalled();
    },
  );

  it("lets a database failure escape the cached scope instead of 404ing", async () => {
    // A caught failure would be stored as a successful 404 for the whole
    // cacheLife("days") window; throwing keeps the route transient.
    stationFindUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );

    await expect(resolvePageContent("60003760")).rejects.toThrow(
      "Too many database connections opened",
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("station page metadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stationFindUnique.mockReset();
  });

  it("canonicalises onto the parsed id", async () => {
    stationFindUnique.mockResolvedValue({
      name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
    });
    const { generateMetadata } = await import("~/app/station/[stationId]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ stationId: "60003760" }),
    });

    expect(metadata.alternates?.canonical).toBe("/station/60003760");
  });

  it.each(["0", "060003760", "60003760.0"])(
    "emits no metadata at all for %p",
    async (stationId) => {
      const { generateMetadata } =
        await import("~/app/station/[stationId]/page");

      expect(
        await generateMetadata({ params: Promise.resolve({ stationId }) }),
      ).toEqual({});
      expect(stationFindUnique).not.toHaveBeenCalled();
    },
  );
});
