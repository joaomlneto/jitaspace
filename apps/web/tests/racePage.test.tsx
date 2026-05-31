import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseRace = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ raceId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useRace: (raceId: number) => mockUseRace(raceId),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/Avatar", () => ({
  RaceAvatar: () => null,
}));

jest.mock("~/components/Text", () => ({
  RaceName: ({ raceId }: { raceId: number }) => <span>{`Race ${raceId}`}</span>,
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

describe("race page", () => {
  beforeEach(() => {
    mockUseRace.mockReset();
  });

  it("renders rich race details when data is available", () => {
    mockUseRace.mockReturnValue({
      data: {
        race_id: 1,
        alliance_id: 500001,
        description: "Founded by exiles of the Amarr Empire.",
      },
    });

    const Page = require("~/app/race/[raceId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Race 1")).toBeInTheDocument();
    expect(
      screen.getByText("Founded by exiles of the Amarr Empire."),
    ).toBeInTheDocument();
    expect(screen.getByText("Faction")).toBeInTheDocument();

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/faction/500001");
  });

  it("renders static label and faction link when race data is undefined", () => {
    mockUseRace.mockReturnValue({ data: undefined });

    const Page = require("~/app/race/[raceId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Race 1")).toBeInTheDocument();
    expect(screen.getByText("Faction")).toBeInTheDocument();
    // faction link still rendered, pointing at undefined id
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/faction/undefined");
    expect(
      screen.queryByText("Founded by exiles of the Amarr Empire."),
    ).not.toBeInTheDocument();
  });
});
