import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUsePlanet = jest.fn();
const mockPlanetFindUnique =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// The server wrapper reads the planet (through a "use cache" helper) to 404 an
// id with no planet; `generateMetadata` shares that read.
jest.mock("~/lib/db", () => ({
  prisma: {
    planet: { findUnique: (...a: unknown[]) => mockPlanetFindUnique(...a) },
  },
}));

jest.mock("@jitaspace/hooks", () => ({
  usePlanet: (planetId: number) => mockUsePlanet(planetId),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: ({
    solarSystemId,
  }: {
    solarSystemId?: number;
  }) => <span>{`SecBadge ${solarSystemId}`}</span>,
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

describe("planet page", () => {
  beforeEach(() => {
    mockUsePlanet.mockReset();
  });

  it("renders rich planet details when data is available", () => {
    mockUsePlanet.mockReturnValue({
      data: {
        data: {
          name: "Jita IV",
          type_id: 13,
          system_id: 30000142,
          position: { x: 1.1, y: 2.2, z: 3.3 },
        },
      },
    });

    const Page = require("~/app/planet/[planetId]/page.client").default;
    render(
      <MantineProvider>
        <Page planetId={40009081} />
      </MantineProvider>,
    );

    expect(mockUsePlanet).toHaveBeenCalledWith(40009081);
    expect(screen.getByText("Jita IV")).toBeInTheDocument();
    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("SecBadge 30000142")).toBeInTheDocument();
    expect(screen.getByText("Planet Type")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/system/30000142");
    expect(hrefs).toContain("/type/13");
  });

  it("renders with undefined position and missing data", () => {
    mockUsePlanet.mockReturnValue({
      data: {
        data: {
          name: undefined,
          type_id: undefined,
          system_id: undefined,
          position: undefined,
        },
      },
    });

    const Page = require("~/app/planet/[planetId]/page.client").default;
    render(
      <MantineProvider>
        <Page planetId={40009081} />
      </MantineProvider>,
    );

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Planet Type")).toBeInTheDocument();
    expect(screen.getByText("Position")).toBeInTheDocument();
    // badge renders with undefined id (exercises the undefined branch)
    expect(screen.getByText(/SecBadge/)).toBeInTheDocument();
    expect(screen.queryByText("Jita IV")).not.toBeInTheDocument();
  });
});

describe("planet page server wrapper", () => {
  beforeEach(() => {
    mockPlanetFindUnique.mockReset();
  });

  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(planetId: string) {
    const Page = require("~/app/planet/[planetId]/page").default;
    const tree = Page({ params: Promise.resolve({ planetId }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<unknown>;
  }

  it("passes the parsed id to the client page", async () => {
    mockPlanetFindUnique.mockResolvedValue({ name: "Jita IV" });
    const element = (await runWrapper("40009081")) as {
      props: { planetId: number };
    };
    expect(element.props.planetId).toBe(40009081);
    expect(mockPlanetFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { planetId: 40009081 } }),
    );
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/planet/40009081.0` used to serve the same planet as `/planet/40009081`.
    await expect(runWrapper("40009081.0")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockPlanetFindUnique).not.toHaveBeenCalled();
  });

  it("404s an id with no planet", async () => {
    mockPlanetFindUnique.mockResolvedValue(null);
    await expect(runWrapper("40009081")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // The route is cached whole, so a 404 rendered for a failed read would be
  // stored and served after the database recovers. The error must propagate.
  it("lets a failed read throw instead of rendering a 404", async () => {
    mockPlanetFindUnique.mockRejectedValue(new Error("db"));
    await expect(runWrapper("40009081")).rejects.toThrow("db");
  });

  it("lists one placeholder param, which 404s without a query", async () => {
    const { generateStaticParams } = require("~/app/planet/[planetId]/page");
    const params = generateStaticParams() as { planetId: string }[];
    expect(params).toEqual([{ planetId: "0" }]);

    await expect(runWrapper(params[0]!.planetId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockPlanetFindUnique).not.toHaveBeenCalled();
  });
});
