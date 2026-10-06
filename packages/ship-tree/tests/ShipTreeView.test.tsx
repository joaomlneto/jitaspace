import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

import { SHIP_TREE_DATA_BASE_URL } from "../data";
import { ShipTreeView } from "../ShipTreeView";
import { ALL_TABLE_FILES, byName, createFakeFetch, fileName } from "./helpers";

// What the adapter hands the library, recorded by pass-through wrappers that
// still render the real thing, so the same tests can also look at real output.
const mockSeen = {
  skills: [] as unknown[],
  dataProps: [] as { baseUrl: unknown; hasFetch: boolean }[],
  shipTree: [] as { faction: unknown; isOmega: unknown }[],
  grid: [] as Record<string, unknown>[],
};

jest.mock("@eve-online-tools/eve-ship-tree", () => {
  const actual = jest.requireActual("@eve-online-tools/eve-ship-tree");
  const React = require("react");
  const wrap = (
    Component: any,
    record: (props: any) => void,
    statics: object = {},
  ) =>
    Object.assign((props: any) => {
      record(props);
      return React.createElement(Component, props);
    }, statics);

  return {
    ...actual,
    SkillsProvider: wrap(actual.SkillsProvider, (p) =>
      mockSeen.skills.push(p.skills),
    ),
    DataProvider: wrap(actual.DataProvider, (p) =>
      mockSeen.dataProps.push({
        baseUrl: p.baseUrl,
        hasFetch: typeof p.fetch === "function",
      }),
    ),
    ShipTree: wrap(
      actual.ShipTree,
      (p) => mockSeen.shipTree.push({ faction: p.faction, isOmega: p.isOmega }),
      actual.ShipTree,
    ),
    Grid: wrap(actual.Grid, (p) => mockSeen.grid.push(p)),
  };
});

const renderView = (ui: ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// The library parses ~1.3 MB of JSON Lines and draws hundreds of SVG sprites.
const READY = { timeout: 15_000 };

describe("ShipTreeView", () => {
  beforeEach(() => {
    mockSeen.skills.length = 0;
    mockSeen.dataProps.length = 0;
    mockSeen.shipTree.length = 0;
    mockSeen.grid.length = 0;
  });

  it("draws the chosen faction's tree from the data tables", async () => {
    const { fetch, requested } = createFakeFetch();

    const { container } = renderView(
      <ShipTreeView faction={500003} fetch={fetch} />,
    );

    const content = await screen.findByTestId("ship-tree-content", {}, READY);
    expect(content).toHaveAttribute("data-faction", "500003");
    // Hundreds of ship and frame sprites: an empty or failed tree has none.
    expect(container.querySelectorAll("image").length).toBeGreaterThan(300);
    expect(requested.map(fileName).sort(byName)).toEqual(ALL_TABLE_FILES);
  });

  it("labels the frame after the faction, with none of the library's placeholder text", async () => {
    const { fetch } = createFakeFetch();

    const { container } = renderView(
      <ShipTreeView faction={500004} fetch={fetch} />,
    );
    await screen.findByTestId("ship-tree-content", {}, READY);

    expect(screen.getByText("Gallente Federation")).toBeInTheDocument();
    expect(screen.getByText("Gallente Federation ships")).toBeInTheDocument();
    // The library's defaults: an invented client version and in-game flavour.
    expect(container).not.toHaveTextContent("V1.569.496");
    expect(container).not.toHaveTextContent("Kaalakiota");
    expect(container).not.toHaveTextContent("Military and industrial vessels");
  });

  it("fetches from the app's data route unless told otherwise", () => {
    const { fetch } = createFakeFetch();

    renderView(<ShipTreeView faction={500001} fetch={fetch} />);

    expect(mockSeen.dataProps[0]?.baseUrl).toBe(SHIP_TREE_DATA_BASE_URL);
  });

  it("fetches from the base URL it is given", async () => {
    const { fetch, requested } = createFakeFetch();

    renderView(
      <ShipTreeView
        faction={500001}
        fetch={fetch}
        dataBaseUrl="/elsewhere/tables"
      />,
    );
    await screen.findByTestId("ship-tree-content", {}, READY);

    expect(requested).toHaveLength(ALL_TABLE_FILES.length);
    for (const url of requested) {
      expect(url.startsWith("/elsewhere/tables/")).toBe(true);
    }
  });

  it("hands the library the skills it is given, as an ESI array or a map", () => {
    const { fetch } = createFakeFetch();
    const esi = [{ skill_id: 3330, active_skill_level: 4 }];

    const { rerender } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} skills={esi} />,
    );
    rerender(
      <MantineProvider>
        <ShipTreeView faction={500001} fetch={fetch} skills={{ 3330: 2 }} />
      </MantineProvider>,
    );

    expect(mockSeen.skills).toContain(esi);
    expect(mockSeen.skills).toContainEqual({ 3330: 2 });
  });

  it("treats no skills as an empty set, and keeps that value stable between renders", () => {
    const { fetch } = createFakeFetch();

    const { rerender } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} />,
    );
    rerender(
      <MantineProvider>
        <ShipTreeView faction={500002} fetch={fetch} />
      </MantineProvider>,
    );

    expect(mockSeen.skills[0]).toEqual({});
    // A fresh `{}` per render would re-run the library's data processing.
    expect(mockSeen.skills[1]).toBe(mockSeen.skills[0]);
  });

  it("defaults to an alpha tree, and passes Omega through", () => {
    const { fetch } = createFakeFetch();

    const { rerender } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} />,
    );
    rerender(
      <MantineProvider>
        <ShipTreeView faction={500001} fetch={fetch} isOmega />
      </MantineProvider>,
    );

    expect(mockSeen.shipTree.map((s) => s.isOmega)).toEqual([false, true]);
  });

  it("keeps the loaded data when the faction changes", async () => {
    const { fetch, requested } = createFakeFetch();

    const { rerender } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} />,
    );
    const first = await screen.findByTestId("ship-tree-content", {}, READY);
    expect(first).toHaveAttribute("data-faction", "500001");

    rerender(
      <MantineProvider>
        <ShipTreeView faction={500002} fetch={fetch} />
      </MantineProvider>,
    );

    await waitFor(
      () =>
        expect(screen.getByTestId("ship-tree-content")).toHaveAttribute(
          "data-faction",
          "500002",
        ),
      READY,
    );
    // Still the original requests: switching faction is not a reload.
    expect(requested).toHaveLength(ALL_TABLE_FILES.length);
    expect(screen.getByText("Minmatar Republic ships")).toBeInTheDocument();
  });

  it("shows a disclaimer only when one is given", async () => {
    const { fetch } = createFakeFetch();

    const { rerender } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} />,
    );
    // The library draws the frame only once its data has loaded.
    await screen.findByTestId("ship-tree-content", {}, READY);
    expect(mockSeen.grid.at(-1)?.disclaimer).toBeNull();

    rerender(
      <MantineProvider>
        <ShipTreeView faction={500001} fetch={fetch} disclaimer="Data: SDE" />
      </MantineProvider>,
    );

    expect(mockSeen.grid.at(-1)?.disclaimer).toBe("Data: SDE");
    expect(screen.getByText("Data: SDE")).toBeInTheDocument();
  });

  it("sizes itself, because the library fills its parent", () => {
    const { fetch } = createFakeFetch();

    const { container } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} />,
    );

    // MantineProvider injects a <style> first, so look for the sized box.
    const box = container.querySelector<HTMLElement>("div[style]");
    expect(box?.style.height).toBe("75vh");
    expect(box?.style.minHeight).toContain("26.25rem");
  });

  it("lets the caller choose the size", () => {
    const { fetch } = createFakeFetch();

    const { container } = renderView(
      <ShipTreeView faction={500001} fetch={fetch} h={321} mih={123} />,
    );

    const box = container.querySelector<HTMLElement>("div[style]");
    expect(box?.style.height).toContain("20.0625rem");
    expect(box?.style.minHeight).toContain("7.6875rem");
  });

  it("reports a failed data load instead of drawing a tree", async () => {
    const failing = (() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: { get: () => null },
        text: () => Promise.resolve(""),
      })) as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    renderView(<ShipTreeView faction={500001} fetch={failing} />);

    expect(
      await screen.findByText(/Failed to load ship tree data/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("ship-tree-content")).not.toBeInTheDocument();
  });
});
