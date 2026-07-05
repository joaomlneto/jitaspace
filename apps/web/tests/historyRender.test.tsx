import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// ── mocks ────────────────────────────────────────────────────────────────────

const mockUseQuery = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}));

// The history index page embeds the recharts-backed activity BarChart; stub it
// so these render tests don't depend on chart layout in jsdom.
jest.mock("@mantine/charts", () => ({
  BarChart: () => <div data-testid="barchart" />,
}));

// Stub the server functions so the Prisma-backed @jitaspace/db-history module is
// never loaded; they're only passed as queryFn to the (mocked) useQuery anyway.
jest.mock("~/lib/history-actions", () => ({
  getBuildChanges: jest.fn(),
  getEntityTimeline: jest.fn(),
  getResourceIndex: jest.fn(),
  getFileDiff: jest.fn(),
  getStringChanges: jest.fn(),
}));

// The index page server-renders the day-cached index from ~/lib/history-cache
// (via _load-index); stub it and next/server's connection() so importing the page
// doesn't pull in @jitaspace/db-history or need the Next request runtime.
jest.mock("~/lib/history-cache", () => ({
  getCachedHistoryIndex: jest.fn(),
  getCachedEntityTimeline: jest.fn(),
}));
jest.mock("next/server", () => ({ connection: () => Promise.resolve() }));

// Every `getXByIdQueryOptions(id)` returns a valid query-options object whose
// queryKey the mocked useQuery resolves to a generic name.
jest.mock(
  "@jitaspace/sde-client",
  () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          typeof prop === "string"
            ? (id: number) => ({
                queryKey: [prop, id],
                queryFn: () => Promise.resolve({ data: { name: "Rifter" } }),
              })
            : undefined,
      },
    ),
);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  // The compare page reads the selected builds from the URL.
  useSearchParams: () => new URLSearchParams("from=100&to=200"),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: React.ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

// ── fixtures ───────────────────────────────────────────────────────────────

const TIMELINE = {
  entityType: "type",
  entityId: 587,
  events: [
    {
      build: 100,
      date: "2025-01-01",
      collection: "typeDogma",
      fromBuild: 99,
      server: "tranquility",
      provenance: "resource-server",
      v: 1,
      kind: "modified",
      fields: {
        dogmaAttributes: {
          from: [{ attributeID: 3, value: 0 }],
          to: [{ attributeID: 3, value: 1 }],
        },
      },
    },
    {
      build: 99,
      date: "2024-06-01",
      collection: "types",
      v: 1,
      kind: "modified",
      fields: {
        designerIDs: { to: [1000049] },
        mass: { from: 1000, to: 1100 },
      },
    },
    {
      build: 98,
      date: "2024-01-01",
      collection: "types",
      fromBuild: 97,
      server: "tranquility",
      provenance: "sde",
      v: 1,
      kind: "added",
      values: { typeName: "Rifter", mass: 1067000 },
    },
    {
      build: 101,
      date: "2025-02-01",
      collection: "types",
      v: 1,
      kind: "modified",
      fields: {
        groupID: { from: 25, to: 26 },
        raceID: { from: 1, to: 2 },
        factionID: { from: 500001, to: 500002 },
        marketGroupID: { from: 10, to: 11 },
        wreckTypeID: { from: 1, to: 2 },
        basePrice: { from: 100, to: 200 },
        types: { from: [587], to: [587, 588] },
      },
    },
    {
      build: 97,
      date: "2023-12-01",
      collection: "typeDogma",
      v: 1,
      kind: "added",
      values: {
        dogmaAttributes: [
          { attributeID: 9, value: 350 },
          { attributeID: 11, value: 40 },
        ],
      },
    },
  ],
};

const BUILD_CHANGES = {
  build: 3383521,
  date: "2026-06-08",
  changes: [
    {
      entityId: 91920,
      entityType: "type",
      collection: "types",
      v: 1,
      kind: "added",
      values: {},
    },
    {
      entityId: 587,
      entityType: "type",
      collection: "typeDogma",
      v: 1,
      kind: "modified",
      fields: {},
    },
    {
      entityId: 999,
      entityType: "type",
      collection: "types",
      v: 1,
      kind: "removed",
      values: {},
    },
    {
      entityId: 1,
      entityType: "skin",
      collection: "skins",
      v: 1,
      kind: "added",
      values: {},
    },
  ],
};

const RESOURCE_INDEX = {
  generatedAt: "x",
  languages: ["en-us"],
  builds: [
    {
      build: 3383521,
      date: "2026-06-08",
      files: { added: 5, changed: 2, removed: 0 },
      strings: { "en-us": { added: 3, changed: 1, removed: 0 } },
    },
  ],
};

const HISTORY_INDEX = {
  generatedAt: "x",
  collections: ["types", "typeDogma"],
  entityTypes: ["type", "skin"],
  entityCountsByType: { type: 1, skin: 1 },
  builds: [
    {
      build: 100,
      date: "2025-01-01",
      changeCount: 5,
      byCollection: { types: 3, typeDogma: 2 },
    },
    { build: 99, date: "2024-06-01", changeCount: 0 },
  ],
};

const RANGE_CHANGES = {
  from: 100,
  to: 200,
  fromDate: "2025-01-01",
  toDate: "2025-02-01",
  changes: [
    {
      entityId: 587,
      entityType: "type",
      collection: "types",
      v: 1,
      kind: "modified",
      fields: {},
    },
    {
      entityId: 588,
      entityType: "type",
      collection: "types",
      v: 1,
      kind: "added",
    },
  ],
};

function dataFor(opts: { queryKey?: unknown[] }) {
  const k = opts.queryKey?.[0];
  const ready = { isLoading: false, isPending: false, isFetching: false };
  if (k === "history-index") return { data: HISTORY_INDEX, ...ready };
  if (k === "history-entity") return { data: TIMELINE, ...ready };
  if (k === "history-build") return { data: BUILD_CHANGES, ...ready };
  if (k === "history-compare") return { data: RANGE_CHANGES, ...ready };
  if (k === "resource-index") return { data: RESOURCE_INDEX, ...ready };
  if (k === "res-files")
    return {
      data: { added: ["res:/a.png"], changed: ["res:/b.png"], removed: [] },
      ...ready,
    };
  if (k === "res-strings")
    return { data: [{ id: 1, kind: "added", to: "Hello" }], ...ready };
  // SDE name lookups (getTypeByIdQueryOptions etc.)
  return { data: { data: { name: "Rifter" } }, ...ready };
}

const wrap = (ui: React.ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

beforeEach(() => {
  mockUseQuery.mockReset();
  mockUseQuery.mockImplementation((opts: { queryKey?: unknown[] }) =>
    dataFor(opts),
  );
});
afterEach(cleanup);

// ── tests ────────────────────────────────────────────────────────────────────

describe("HistoryIndexClient", () => {
  it("renders the build timeline + tracking chips from the index prop", async () => {
    const { default: HistoryIndexClient } =
      await import("~/app/history/page.client");
    wrap(<HistoryIndexClient initialIndex={HISTORY_INDEX} />);
    expect(screen.getByText("Type Change History")).toBeTruthy();
    expect(screen.getByText("Build 100")).toBeTruthy();
  });

  it("renders an empty state when the index prop is null", async () => {
    const { default: HistoryIndexClient } =
      await import("~/app/history/page.client");
    wrap(<HistoryIndexClient initialIndex={null} />);
    expect(screen.getByText(/No history has been generated/)).toBeTruthy();
  });

  it("virtualizes the build list — renders only a window, not every build", async () => {
    const { default: HistoryIndexClient } =
      await import("~/app/history/page.client");
    // 80 changed builds; the windowed list should mount only ~one viewport.
    const builds = Array.from({ length: 80 }, (_, i) => ({
      build: 1000 + i,
      date: "2024-01-01",
      changeCount: 3,
      byCollection: { types: 3 },
    }));
    wrap(
      <HistoryIndexClient
        initialIndex={{
          generatedAt: "x",
          collections: ["types"],
          entityTypes: ["type"],
          entityCountsByType: { type: 1 },
          builds,
        }}
      />,
    );
    const rows = screen.getAllByText(/^Build \d+$/);
    expect(rows.length).toBeGreaterThan(5); // a window did render
    expect(rows.length).toBeLessThan(40); // but nowhere near all 80
  });
});

describe("EntityHistory", () => {
  it("renders a per-build timeline of changes", async () => {
    const { EntityHistory } = await import("~/app/history/EntityHistory");
    wrap(
      <EntityHistory
        entityType="type"
        entityId={587}
        renderHeader={() => <div>Rifter header</div>}
      />,
    );
    expect(screen.getByText("Rifter header")).toBeTruthy();
    expect(screen.getByText("2025-01-01")).toBeTruthy();
    // per-entry provenance / server / from-build metadata
    expect(screen.getAllByText("Tranquility").length).toBeGreaterThan(0);
    expect(screen.getByText("Resource Server")).toBeTruthy();
    expect(screen.getByText("SDE")).toBeTruthy();
    expect(screen.getByText(/from build 99/)).toBeTruthy();
    expect(screen.getByText(/from build 97/)).toBeTruthy();
  });

  it("renders an empty state when there are no events", async () => {
    const { EntityHistory } = await import("~/app/history/EntityHistory");
    mockUseQuery.mockImplementation(() => ({
      data: { entityType: "type", entityId: 1, events: [] },
      isLoading: false,
    }));
    wrap(
      <EntityHistory
        entityType="type"
        entityId={1}
        renderHeader={() => <div>empty header</div>}
      />,
    );
    expect(screen.getByText(/No recorded changes/)).toBeTruthy();
  });
});

describe("BuildHistoryClient", () => {
  it("renders new/removed/changed sections + resources, and expands lazy lists", async () => {
    const { default: BuildHistoryClient } =
      await import("~/app/history/build/[build]/page.client");
    wrap(<BuildHistoryClient build={3383521} />);
    expect(screen.getByText("Build 3383521")).toBeTruthy();
    expect(screen.getByText("Resources")).toBeTruthy();

    // expand the Files + localization sections to cover the lazy query branches
    fireEvent.click(screen.getByText(/Files/));
    fireEvent.click(screen.getByText(/English/));
    expect(screen.getAllByText(/res:\//).length).toBeGreaterThan(0);
  });
});

describe("detail page clients + index page", () => {
  it("renders the type / skin / skinMaterial / entity history clients", async () => {
    const { default: TypeHistoryClient } =
      await import("~/app/history/type/[typeId]/page.client");
    const { default: SkinHistoryClient } =
      await import("~/app/history/skin/[skinId]/page.client");
    const { default: SkinMaterialHistoryClient } =
      await import("~/app/history/skinMaterial/[skinMaterialId]/page.client");
    const { default: EntityHistoryClient } =
      await import("~/app/history/[entityType]/[id]/page.client");
    expect(() => wrap(<TypeHistoryClient typeId={587} />)).not.toThrow();
    expect(() => wrap(<SkinHistoryClient skinId={1} />)).not.toThrow();
    expect(() =>
      wrap(<SkinMaterialHistoryClient skinMaterialId={1} />),
    ).not.toThrow();
    expect(() =>
      wrap(<EntityHistoryClient entityType="group" entityId={25} />),
    ).not.toThrow();
  });

  it("covers the static-metadata index page", async () => {
    const mod = (await import("~/app/history/page")) as {
      metadata: { title: string };
      default: () => React.ReactNode;
    };
    expect(mod.metadata.title).toContain("Change History");
    const Page = mod.default;
    expect(() => wrap(<Page />)).not.toThrow();
  });
});

describe("CompareBuildsClient", () => {
  it("renders the net comparison for the from/to in the URL", async () => {
    const { default: CompareBuildsClient } =
      await import("~/app/history/compare/page.client");
    wrap(
      <CompareBuildsClient
        builds={[
          { build: 100, date: "2025-01-01" },
          { build: 200, date: "2025-02-01" },
        ]}
      />,
    );
    expect(screen.getByText("Compare builds")).toBeTruthy();
    // result header, driven by the mocked ?from=100&to=200
    expect(screen.getByText(/build 100 → build 200/)).toBeTruthy();
    // reuses the build page's New / Changed sections for the net changes
    expect(screen.getByText(/New types/)).toBeTruthy();
    expect(screen.getByText(/Changed types/)).toBeTruthy();
  });
});
