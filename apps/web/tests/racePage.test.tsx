import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseRace = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ raceId: "1" }),
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The server page imports prisma for generateMetadata; the coverage CI job has
// no generated Prisma client, so stub the module out.
jest.mock("~/lib/db", () => ({ prisma: {} }));

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

  it("renders the faction row unlinked when race data is undefined", () => {
    mockUseRace.mockReturnValue({ data: undefined });

    const Page = require("~/app/race/[raceId]/page.client").default;
    render(
      <MantineProvider>
        <Page />
      </MantineProvider>,
    );

    // The row itself must survive, so the layout does not shift once the
    // faction id arrives.
    expect(screen.getByText("Race 1")).toBeInTheDocument();
    expect(screen.getByText("Faction")).toBeInTheDocument();

    // ...but no link may be emitted while the id is unknown. Interpolating
    // `undefined` into the href produced /faction/undefined, which next/link
    // then eagerly prefetched — ~100k requests/day in production across
    // /race, /bloodline, /type and /system.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    const hrefs = Array.from(document.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.some((href) => href?.includes("undefined"))).toBe(false);

    expect(
      screen.queryByText("Founded by exiles of the Amarr Empire."),
    ).not.toBeInTheDocument();
  });
});

// `Page` returns <Suspense> wrapping the async <PageContent>, which is where
// `await params` happens. jsdom's renderer will not await an async component,
// so pull the inner element out and invoke it directly (the same approach
// tests/groupPage.test.tsx uses).
async function resolvePageContent(raceId: string) {
  const Page = require("~/app/race/[raceId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ raceId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("race page id validation", () => {
  it("renders the client page for the canonical spelling of an id", async () => {
    const tree = (await resolvePageContent("1")) as { type: unknown };
    expect(tree.type).toBe(require("~/app/race/[raceId]/page.client").default);
  });

  it.each(["0", "-1", "01", "1.0", "bad", ""])(
    "404s rather than serving a second URL for %p",
    async (raceId) => {
      await expect(resolvePageContent(raceId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
    },
  );
});
