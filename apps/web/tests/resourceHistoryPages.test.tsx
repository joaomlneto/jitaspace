import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type * as ReactModule from "react";
import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as FilePageModule from "~/app/file/[...path]/page.client";
import type * as StringPageModule from "~/app/string/[stringId]/page.client";
import type { FileHistory, StringHistory } from "~/lib/resource-pages";

// Like the real viewer, whose editor takes its content only when it mounts.
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content: string }) => {
    const { useState } = require("react") as typeof ReactModule;
    const [mounted] = useState(content);
    return <div data-testid="formatted">{mounted}</div>;
  },
}));
jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => `sanitized:${s}`,
}));

const mockLineChart = jest.fn<(props: Record<string, unknown>) => void>();
jest.mock("@mantine/charts", () => ({
  LineChart: (props: Record<string, unknown>) => {
    mockLineChart(props);
    const tooltip = (
      props.tooltipProps as {
        content: (p: { payload: unknown[] }) => ReactElement;
      }
    ).content;
    const data = props.data as unknown[];
    return (
      <div data-testid="chart">
        {tooltip({ payload: [{ payload: data.at(-1) }] })}
        {tooltip({ payload: [] })}
      </div>
    );
  },
}));

// jest.mock is not hoisted in this app's jest setup.
const StringPage =
  require("~/app/string/[stringId]/page.client") as typeof StringPageModule;
const FilePage =
  require("~/app/file/[...path]/page.client") as typeof FilePageModule;

const stringHistory: StringHistory = {
  stringId: 123,
  languages: ["en-us", "de", "zh"],
  events: [
    {
      build: 100,
      date: "2024-01-01",
      server: "tranquility",
      lang: "en-us",
      op: "added",
      to: "Hello pilot",
    },
    {
      build: 100,
      date: "2024-01-01",
      server: "tranquility",
      lang: "de",
      op: "added",
      to: "Hallo Pilot",
    },
    {
      build: 150,
      date: "2024-02-01",
      server: "singularity",
      lang: "en-us",
      op: "changed",
      from: "Hello pilot",
      to: "Hello capsuleer",
    },
    {
      build: 200,
      date: "2024-03-01",
      server: "tranquility",
      lang: "en-us",
      op: "changed",
      from: "Hello pilot",
      to: "Greetings pilot",
    },
    {
      build: 200,
      date: "2024-03-01",
      server: "tranquility",
      lang: "zh",
      op: "removed",
      from: "你好",
    },
  ],
};

// The page is ISR: whatever the server render draws is what every later
// visitor gets from the cache. A control calling Math.random() while
// rendering (Mantine's SegmentedControl did) makes that render drop the page's
// content, so cached visitors saw it only after hydration.
describe("string page server render", () => {
  it("draws its controls without Math.random()", () => {
    const { NuqsAdapter } = require("nuqs/adapters/react");
    const { renderToString } = require("react-dom/server");
    const random = jest.spyOn(Math, "random");
    try {
      const html: string = renderToString(
        <MantineProvider>
          <NuqsAdapter>
            <StringPage.default history={stringHistory} />
          </NuqsAdapter>
        </MantineProvider>,
      );
      expect(html).toContain('role="radiogroup"');
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});

function renderString(
  history: StringHistory = stringHistory,
  adapter: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction } = {},
) {
  return render(
    <MantineProvider env="test">
      <StringPage.default history={history} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ hasMemory: true, ...adapter }) },
  );
}

describe("string page helpers", () => {
  it("matches servers, counting SDE-era builds as Tranquility's", () => {
    expect(StringPage.matchesServer("tranquility", "tranquility")).toBe(true);
    expect(StringPage.matchesServer(null, "tranquility")).toBe(true);
    expect(StringPage.matchesServer("singularity", "tranquility")).toBe(false);
    expect(StringPage.matchesServer("singularity", "singularity")).toBe(true);
    expect(StringPage.matchesServer(null, "all")).toBe(true);
  });

  it("finds each language's latest event", () => {
    const latest = StringPage.latestByLanguage(stringHistory.events);
    expect(latest.get("en-us")?.build).toBe(200);
    expect(latest.get("de")?.build).toBe(100);
    expect(latest.get("zh")?.op).toBe("removed");
  });

  it("groups events by build, newest first, English first within one", () => {
    const groups = StringPage.groupByBuild(stringHistory.events);
    expect(groups.map((g) => g.build)).toEqual([200, 150, 100]);
    expect(groups[2]?.events.map((e) => e.lang)).toEqual(["en-us", "de"]);
    expect(groups[1]?.server).toBe("singularity");
  });
});

describe("string page", () => {
  it("shows English on Tranquility by default, formatted and as a timeline", () => {
    renderString();
    expect(screen.getByRole("heading", { name: "String 123" })).toBeVisible();
    expect(screen.getByTestId("formatted")).toHaveTextContent(
      "sanitized:Greetings pilot",
    );
    // The Singularity build is filtered out; Tranquility builds link out.
    expect(screen.queryByText("Build 150")).not.toBeInTheDocument();
    // Linked from the current text ("as of") and the timeline.
    for (const link of screen.getAllByRole("link", { name: "Build 200" }))
      expect(link).toHaveAttribute("href", "/history/build/200");
    expect(screen.getByText("Hello", { selector: "del" })).toBeVisible();
    expect(screen.getByText("Greetings", { selector: "ins" })).toBeVisible();
  });

  it("filters by server, from the URL", () => {
    renderString(stringHistory, { searchParams: "?server=singularity" });
    expect(screen.getAllByText("Build 150")).not.toHaveLength(0);
    // Singularity builds have no build page to link to.
    expect(
      screen.queryByRole("link", { name: "Build 150" }),
    ).not.toBeInTheDocument();
    // The build is badged as a Singularity build (besides the filter's label).
    expect(
      screen
        .getAllByText("Singularity")
        .some((el) => el.closest(".mantine-Badge-root") !== null),
    ).toBe(true);
    expect(screen.getByText("capsuleer", { selector: "ins" })).toBeVisible();
  });

  it("updates the formatted text when the server filter changes", () => {
    renderString();
    expect(screen.getByTestId("formatted")).toHaveTextContent(
      "Greetings pilot",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Singularity" }));
    expect(screen.getByTestId("formatted")).toHaveTextContent(
      "Hello capsuleer",
    );
  });

  it("opens a Singularity-only string on all servers", () => {
    const sisiOnly: StringHistory = {
      stringId: 9,
      languages: ["en-us"],
      events: [
        {
          build: 150,
          date: null,
          server: "singularity",
          lang: "en-us",
          op: "added",
          to: "Test text",
        },
      ],
    };
    expect(StringPage.defaultFilters(sisiOnly)).toEqual({
      defaultServer: "all",
      defaultLanguages: ["en-us"],
    });
    renderString(sisiOnly);
    expect(screen.getByTestId("formatted")).toHaveTextContent("Test text");
  });

  it("opens on a language that changed on the default server", () => {
    expect(
      StringPage.defaultFilters({
        ...stringHistory,
        events: stringHistory.events.filter(
          (e) => e.lang !== "en-us" || e.server === "singularity",
        ),
      }).defaultLanguages,
    ).toEqual(["de"]);
  });

  it("adds languages, writing them to the URL", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderString(stringHistory, { onUrlUpdate });
    fireEvent.click(screen.getByRole("checkbox", { name: "Chinese" }));
    expect(await screen.findByText("Removed")).toBeVisible();
    // Chinese is compared character by character.
    expect(screen.getByText("你好", { selector: "del" })).toBeVisible();
    expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toBe(
      "?lang=en-us,zh",
    );
  });

  it("shows a removed string's last text, struck, in markup mode", () => {
    renderString(stringHistory, { searchParams: "?lang=zh" });
    fireEvent.click(
      screen.getByRole("switch", { name: "Show the Chinese markup" }),
    );
    const raw = screen.getByText("你好", { selector: "p" });
    expect(raw).toHaveStyle({ textDecoration: "line-through" });
  });

  it("says so when the filters leave nothing", () => {
    renderString(stringHistory, {
      searchParams: "?lang=de&server=singularity",
    });
    expect(
      screen.getByText(/No changes recorded for the selected languages/),
    ).toBeVisible();
  });

  it("falls back to the first language when English was never recorded", () => {
    renderString({
      ...stringHistory,
      languages: ["de"],
      events: stringHistory.events.filter((e) => e.lang === "de"),
    });
    expect(screen.getByTestId("formatted")).toHaveTextContent("Hallo Pilot");
  });
});

const fileHistory: FileHistory = {
  path: "res:/ui/texture/icons/1_64_1.png",
  events: [
    { build: 100, date: "2024-01-01", op: "added", size: 2048, hash: "aaa" },
    { build: 150, date: null, op: "modified", size: 4096, hash: "bbb" },
    { build: 200, date: "2024-03-01", op: "modified", size: 3072, hash: "ccc" },
  ],
};

const renderFile = (history: FileHistory = fileHistory) =>
  render(
    <MantineProvider env="test">
      <FilePage.default history={history} />
    </MantineProvider>,
  );

describe("file page helpers", () => {
  it("plots dated changes only, a removal at zero bytes", () => {
    expect(
      FilePage.sizePoints([
        ...fileHistory.events,
        {
          build: 300,
          date: "2024-04-01",
          op: "removed",
          size: null,
          hash: null,
        },
      ]),
    ).toEqual([
      {
        time: Date.parse("2024-01-01T00:00:00Z"),
        build: 100,
        date: "2024-01-01",
        size: 2048,
      },
      {
        time: Date.parse("2024-03-01T00:00:00Z"),
        build: 200,
        date: "2024-03-01",
        size: 3072,
      },
      {
        time: Date.parse("2024-04-01T00:00:00Z"),
        build: 300,
        date: "2024-04-01",
        size: 0,
      },
    ]);
  });

  it("marks every dated change, once per date, and ticks once per month", () => {
    const events = [
      { build: 1, date: "2024-03-01", op: "added", size: 10, hash: null },
      { build: 2, date: "2024-03-01", op: "modified", size: null, hash: null },
      { build: 3, date: "2024-03-20", op: "modified", size: 12, hash: null },
      { build: 4, date: null, op: "modified", size: 14, hash: null },
      { build: 5, date: "2024-05-02", op: "modified", size: 9, hash: null },
    ] as const;
    expect(FilePage.changeTimes(events)).toEqual([
      Date.parse("2024-03-01T00:00:00Z"),
      Date.parse("2024-03-20T00:00:00Z"),
      Date.parse("2024-05-02T00:00:00Z"),
    ]);
    expect(FilePage.monthTicks(FilePage.sizePoints(events))).toEqual([
      Date.parse("2024-03-01T00:00:00Z"),
      Date.parse("2024-05-02T00:00:00Z"),
    ]);
  });

  it("measures each change against the one before", () => {
    expect(FilePage.sizeDeltas(fileHistory.events)).toEqual([
      null,
      2048,
      -1024,
    ]);
  });

  it("leaves out changes recorded without a size, rather than plotting 0", () => {
    const events = [
      { build: 1, date: "2023-01-01", op: "added", size: null, hash: null },
      { build: 2, date: "2023-02-01", op: "modified", size: 500, hash: "h" },
      { build: 3, date: "2023-03-01", op: "removed", size: null, hash: null },
    ] as const;
    expect(FilePage.sizePoints(events).map((p) => [p.build, p.size])).toEqual([
      [2, 500],
      [3, 0],
    ]);
    expect(FilePage.sizeDeltas(events)).toEqual([null, null, -500]);
  });
});

describe("file page", () => {
  it("shows the current size and hash, a chart and every change", () => {
    renderFile();
    expect(screen.getByRole("heading", { name: "1_64_1.png" })).toBeVisible();
    expect(screen.getAllByText("3 KB").length).toBeGreaterThanOrEqual(2);
    // The current hash, in the stat card (copyable) and the newest row.
    expect(screen.getAllByText("ccc")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Copy ccc" })).toBeVisible();
    expect(screen.getByText("Present")).toBeVisible();
    expect(screen.getByText("since build 100")).toBeVisible();

    const props = mockLineChart.mock.calls.at(-1)?.[0];
    expect(props?.curveType).toBe("stepAfter");
    expect(props?.referenceLines).toEqual([
      {
        x: Date.parse("2024-01-01T00:00:00Z"),
        color: "gray.6",
        strokeDasharray: "4 4",
      },
      {
        x: Date.parse("2024-03-01T00:00:00Z"),
        color: "gray.6",
        strokeDasharray: "4 4",
      },
    ]);
    const formatTick = (
      props?.xAxisProps as { tickFormatter: (t: number) => string }
    ).tickFormatter;
    expect(formatTick(Date.parse("2024-03-01T00:00:00Z"))).toBe("2024-03");
    // The tooltip names the build and its size.
    expect(
      within(screen.getByTestId("chart")).getByText("Build 200"),
    ).toBeVisible();

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]!).getByRole("link", { name: "200" })).toHaveAttribute(
      "href",
      "/history/build/200",
    );
    expect(within(rows[0]!).getByText("−1 KB")).toBeVisible();
    expect(within(rows[1]!).getByText("+2 KB")).toBeVisible();
    expect(within(rows[1]!).getByText("—", { selector: "td" })).toBeVisible();
  });

  it("marks a removed file and has nothing to plot without dates", () => {
    renderFile({
      path: "app:/bin/x.dll",
      events: [
        { build: 100, date: null, op: "added", size: 10, hash: null },
        { build: 200, date: null, op: "removed", size: null, hash: null },
      ],
    });
    expect(screen.getByText("Removed in build 200")).toBeVisible();
    expect(
      screen.getByText(/None of this file's changes has both a release date/),
    ).toBeVisible();
  });
});
