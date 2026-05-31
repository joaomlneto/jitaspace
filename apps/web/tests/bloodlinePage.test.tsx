import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseBloodline = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ bloodlineId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useBloodline: (bloodlineId: number) => mockUseBloodline(bloodlineId),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => `sanitized:${s}`,
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/Avatar", () => ({
  RaceAvatar: () => null,
}));

jest.mock("~/components/Text", () => ({
  BloodlineName: ({ bloodlineId }: { bloodlineId: number }) => (
    <span>{`Bloodline ${bloodlineId}`}</span>
  ),
  RaceName: ({ raceId }: { raceId?: number }) => <span>{`Race ${raceId}`}</span>,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div>{`Viewer:${content}`}</div>
  ),
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

describe("bloodline page", () => {
  beforeEach(() => {
    mockUseBloodline.mockReset();
  });

  it("renders rich bloodline details when data is available", () => {
    mockUseBloodline.mockReturnValue({
      data: {
        bloodline_id: 1,
        corporation_id: 1000006,
        race_id: 1,
        ship_type_id: 596,
        description: "A proud and ancient bloodline.",
        charisma: 6,
        intelligence: 7,
        memory: 5,
        perception: 4,
        willpower: 8,
      },
    });

    const Page = require("~/app/bloodline/[bloodlineId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    expect(screen.getByText("Bloodline 1")).toBeInTheDocument();
    expect(
      screen.getByText("Viewer:sanitized:A proud and ancient bloodline."),
    ).toBeInTheDocument();
    expect(screen.getByText("Corporation")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Corvette")).toBeInTheDocument();

    // character attributes (capitalized labels + values)
    expect(screen.getByText("Charisma")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Intelligence")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Perception")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Willpower")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/corporation/1000006");
    expect(hrefs).toContain("/race/1");
    expect(hrefs).toContain("/type/596");
  });

  it("renders without description block and attributes when bloodline data is undefined", () => {
    mockUseBloodline.mockReturnValue({ data: undefined });

    const Page = require("~/app/bloodline/[bloodlineId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    // Header and static section labels still render.
    expect(screen.getByText("Bloodline 1")).toBeInTheDocument();
    expect(screen.getByText("Corporation")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Corvette")).toBeInTheDocument();

    // description-driven viewer not rendered
    expect(screen.queryByText(/^Viewer:/)).not.toBeInTheDocument();
    // attribute labels not rendered
    expect(screen.queryByText("Charisma")).not.toBeInTheDocument();
  });
});
