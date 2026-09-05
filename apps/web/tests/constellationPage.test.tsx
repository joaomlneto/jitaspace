import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";

const CONSTELLATION_ID = 20000020;

const mockUseConstellation = jest.fn();
const mockConstellationFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// page.tsx reads the constellation (and its region) from the database, both in
// generateMetadata and in the server component inside the Suspense boundary.
jest.mock("~/lib/db", () => ({
  prisma: {
    constellation: {
      findUnique: (...args: unknown[]) => mockConstellationFindUnique(...args),
    },
  },
}));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useConstellation: (id: number) => mockUseConstellation(id),
}));

// The shared stub renders these as null; give them visible output so the
// client-side fallback path is distinguishable from the server-rendered name.
jest.mock("@jitaspace/eve-components", () => ({
  RegionName: ({ regionId }: { regionId: number }) => (
    <span>{`region-${regionId}`}</span>
  ),
  SolarSystemName: ({ solarSystemId }: { solarSystemId: number }) => (
    <span>{`system-${solarSystemId}`}</span>
  ),
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <div>Security Badge</div>,
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

function renderPage(
  props: Partial<{
    constellationId: number;
    name: string;
    regionId: number;
    regionName: string | null;
  }> = {},
) {
  const Page =
    require("~/app/constellation/[constellationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page
        constellationId={CONSTELLATION_ID}
        name="Kimotoro"
        regionId={10000002}
        regionName="The Forge"
        {...props}
      />
    </MantineProvider>,
  );
}

/**
 * Resolve the async server component `page.tsx` renders inside its Suspense
 * boundary, the way the server would.
 */
function renderServerContent(constellationId: string) {
  const Page = require("~/app/constellation/[constellationId]/page").default;
  const tree = Page({ params: Promise.resolve({ constellationId }) });
  expect(tree.type).toBe(Suspense);
  const child = tree.props.children;
  return child.type(child.props) as Promise<ReactNode>;
}

describe("constellation page", () => {
  beforeEach(() => {
    mockUseConstellation.mockReset().mockReturnValue({ data: undefined });
    mockConstellationFindUnique.mockReset();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the server-provided name and region link", () => {
    renderPage();

    expect(mockUseConstellation).toHaveBeenCalledWith(CONSTELLATION_ID);
    // The name is plain server-rendered text, not a client-fetched component.
    expect(screen.getByText("Kimotoro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Forge" })).toHaveAttribute(
      "href",
      "/region/10000002",
    );
  });

  it("falls back to the client region name when the region row is missing", () => {
    renderPage({ regionName: null });

    expect(
      screen.getByRole("link", { name: "region-10000002" }),
    ).toHaveAttribute("href", "/region/10000002");
  });

  it("renders one link per solar system reported by ESI", () => {
    mockUseConstellation.mockReturnValue({
      data: { data: { systems: [30000142, 30000143, 30000144] } },
    });

    renderPage();

    expect(screen.getByText("Solar Systems:")).toBeInTheDocument();
    const systemLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/system/"));
    expect(systemLinks).toHaveLength(3);
    expect(screen.getByText("system-30000142")).toBeInTheDocument();
  });

  it("renders an empty solar system list while ESI data is loading", () => {
    renderPage();

    expect(screen.getByText("Solar Systems:")).toBeInTheDocument();
    const systemLinks = screen
      .queryAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/system/"));
    expect(systemLinks).toHaveLength(0);
  });

  it("server-renders the constellation name from the database", async () => {
    mockConstellationFindUnique.mockResolvedValue({
      name: "Kimotoro",
      regionId: 10000002,
      region: { name: "The Forge" },
    });

    render(
      <MantineProvider>
        {await renderServerContent(String(CONSTELLATION_ID))}
      </MantineProvider>,
    );

    expect(screen.getByText("Kimotoro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Forge" })).toBeInTheDocument();
  });

  it("404s when the constellation does not exist", async () => {
    mockConstellationFindUnique.mockResolvedValue(null);

    await expect(renderServerContent("29999999")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  // Every alternative spelling of an id used to serve the same page at HTTP 200,
  // which is what Search Console counts as a duplicate. The page must reject the
  // spellings generateMetadata rejects, or those URLs would serve a 200 with no
  // metadata at all.
  it.each(["020000020", "20000020.0", "abc", "0"])(
    "404s on the non-canonical id %p without querying the database",
    async (constellationId) => {
      await expect(renderServerContent(constellationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(mockConstellationFindUnique).not.toHaveBeenCalled();
    },
  );

  describe("generateMetadata", () => {
    it("declares a canonical built from the parsed id", async () => {
      mockConstellationFindUnique.mockResolvedValue({ name: "Kimotoro" });
      const { generateMetadata } =
        require("~/app/constellation/[constellationId]/page") as typeof import("~/app/constellation/[constellationId]/page");

      const metadata = await generateMetadata({
        params: Promise.resolve({ constellationId: String(CONSTELLATION_ID) }),
      });

      expect(metadata.title).toBe("Kimotoro");
      expect(metadata.alternates?.canonical).toBe(
        `/constellation/${CONSTELLATION_ID}`,
      );
    });

    it("returns no metadata for a non-canonical id spelling", async () => {
      const { generateMetadata } =
        require("~/app/constellation/[constellationId]/page") as typeof import("~/app/constellation/[constellationId]/page");

      expect(
        await generateMetadata({
          params: Promise.resolve({ constellationId: "020000020" }),
        }),
      ).toEqual({});
      expect(mockConstellationFindUnique).not.toHaveBeenCalled();
    });
  });
});
