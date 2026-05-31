import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

let constellationId = "20000020";

const mockUseConstellation = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ constellationId }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useConstellation: (id: number) => mockUseConstellation(id),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <div>Security Badge</div>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string | object; children?: ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

function renderPage() {
  const Page = require("~/app/constellation/[constellationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("constellation page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    constellationId = "20000020";
  });

  it("renders region link and solar systems list with rich data", () => {
    mockUseConstellation.mockReturnValue({
      data: {
        data: {
          region_id: 10000002,
          systems: [30000142, 30000143, 30000144],
        },
      },
    });

    renderPage();

    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Solar Systems:")).toBeInTheDocument();
    // region link built from constellation data
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/region/10000002");
    // one list item link per system
    const systemLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/system/"));
    expect(systemLinks).toHaveLength(3);
  });

  it("hides region section and renders empty list when data is undefined", () => {
    mockUseConstellation.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.queryByText("Region")).not.toBeInTheDocument();
    expect(screen.getByText("Solar Systems:")).toBeInTheDocument();
    const systemLinks = screen
      .queryAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/system/"));
    expect(systemLinks).toHaveLength(0);
  });

  it("returns null when the constellation id is not finite", () => {
    constellationId = "bad";
    mockUseConstellation.mockReturnValue({ data: undefined });

    renderPage();
    // page returns null -> none of its content is rendered
    expect(screen.queryByText("Solar Systems:")).not.toBeInTheDocument();
  });
});
