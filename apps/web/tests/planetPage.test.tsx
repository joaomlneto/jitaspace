import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUsePlanet = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ planetId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
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
