import "@testing-library/jest-dom/jest-globals";

import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseStar = jest.fn();

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useParams: () => ({ starId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// star/[starId]/page.tsx imports prisma for generateMetadata; the wrapper tests
// below never reach a query.
jest.mock("~/lib/db", () => ({ prisma: {} }));

jest.mock("@jitaspace/hooks", () => ({
  useStar: (starId: number) => mockUseStar(starId),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/Avatar", () => ({
  StarAvatar: () => null,
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: ({
    solarSystemId,
  }: {
    solarSystemId?: number;
  }) => <span>{`SecBadge ${solarSystemId}`}</span>,
}));

describe("star page", () => {
  beforeEach(() => {
    mockUseStar.mockReset();
  });

  it("renders rich star details when data is available", () => {
    mockUseStar.mockReturnValue({
      data: {
        data: {
          name: "Jita - Star",
          solar_system_id: 30000142,
          type_id: 3802,
          age: 9100000000,
          luminosity: 0.06713,
          radius: 482000000,
          spectral_class: "K7 V",
          temperature: 4029,
        },
      },
    });

    const Page = require("~/app/star/[starId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Jita - Star")).toBeInTheDocument();
    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("SecBadge 30000142")).toBeInTheDocument();
    expect(screen.getByText("Star Type")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("9100000000")).toBeInTheDocument();
    expect(screen.getByText("Luminosity")).toBeInTheDocument();
    expect(screen.getByText("0.06713")).toBeInTheDocument();
    expect(screen.getByText("Radius")).toBeInTheDocument();
    expect(screen.getByText("482000000")).toBeInTheDocument();
    expect(screen.getByText("Spectral Class")).toBeInTheDocument();
    expect(screen.getByText("K7 V")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("4029")).toBeInTheDocument();
  });

  it("renders static labels and badge with undefined values when star data is undefined", () => {
    mockUseStar.mockReturnValue({ data: undefined });

    const Page = require("~/app/star/[starId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Star Type")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Luminosity")).toBeInTheDocument();
    expect(screen.getByText("Radius")).toBeInTheDocument();
    expect(screen.getByText("Spectral Class")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    // badge still renders with undefined id
    expect(screen.getByText(/SecBadge/)).toBeInTheDocument();
    // no concrete star name value
    expect(screen.queryByText("Jita - Star")).not.toBeInTheDocument();
  });
});

describe("star page server wrapper", () => {
  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(starId: string) {
    const Page = require("~/app/star/[starId]/page").default;
    const tree = Page({ params: Promise.resolve({ starId }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<unknown>;
  }

  it("renders the client page for a canonical id", async () => {
    await expect(runWrapper("40009077")).resolves.toBeTruthy();
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/star/040009077` used to serve the same star as `/star/40009077`.
    await expect(runWrapper("040009077")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
