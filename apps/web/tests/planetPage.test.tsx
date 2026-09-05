import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUsePlanet = jest.fn();

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useParams: () => ({ planetId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// planet/[planetId]/page.tsx imports prisma for generateMetadata; the wrapper
// tests below never reach a query.
jest.mock("~/lib/db", () => ({ prisma: {} }));

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
        <Page />
      </MantineProvider>,
    );

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
        <Page />
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
  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(planetId: string) {
    const Page = require("~/app/planet/[planetId]/page").default;
    const tree = Page({ params: Promise.resolve({ planetId }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<unknown>;
  }

  it("renders the client page for a canonical id", async () => {
    await expect(runWrapper("40009081")).resolves.toBeTruthy();
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/planet/40009081.0` used to serve the same planet as `/planet/40009081`.
    await expect(runWrapper("40009081.0")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
