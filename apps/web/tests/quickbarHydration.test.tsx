import "@testing-library/jest-dom/jest-globals";

import * as React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import type * as QuickbarLib from "~/lib/quickbar";

type QuickbarModule = typeof QuickbarLib;

/** A fresh copy of the store module, never hydrated yet. */
function loadFresh(): QuickbarModule {
  let loaded: QuickbarModule | undefined;
  jest.isolateModules(() => {
    // The renderer's React, not a second copy: hooks from another copy throw.
    jest.doMock("react", () => React);
    loaded = require("~/lib/quickbar") as QuickbarModule;
  });
  if (!loaded) throw new Error("module did not load");
  return loaded;
}

const KEY = "jitaspace.market-quickbar";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("useQuickbarHydrated", () => {
  it("reports hydration to every component, not just the first to ask", async () => {
    // localStorage is synchronous: the first component's effect finishes
    // hydrating before the second's runs, which then saw nothing to wait for
    // and stayed "not hydrated" — the item page's star stuck disabled.
    const { useQuickbarHydrated } = loadFresh();
    function Probe({ name }: { name: string }) {
      return <span>{`${name}: ${String(useQuickbarHydrated())}`}</span>;
    }

    render(
      <>
        <Probe name="sidebar" />
        <Probe name="star" />
      </>,
    );

    await waitFor(() =>
      expect(screen.getByText("sidebar: true")).toBeInTheDocument(),
    );
    expect(screen.getByText("star: true")).toBeInTheDocument();
  });

  it("renders without storage, as on the server", () => {
    // With no storage zustand leaves `persist` off the store; reading it
    // during render used to throw, and the page fell back to client rendering.
    jest.doMock("zustand/middleware", () => {
      const actual =
        jest.requireActual<Record<string, unknown>>("zustand/middleware");
      return { ...actual, createJSONStorage: () => undefined };
    });
    const { useQuickbarHydrated, useQuickbarStore } = loadFresh();
    jest.dontMock("zustand/middleware");
    expect((useQuickbarStore as { persist?: unknown }).persist).toBeUndefined();

    function Probe() {
      return <span>{`hydrated: ${String(useQuickbarHydrated())}`}</span>;
    }
    // Render only: the effect needs storage, which a server never has.
    expect(renderToString(<Probe />)).toContain("hydrated: false");
  });

  it("gives an empty, working quickbar when the stored one can't be read", async () => {
    // zustand's hydrate never marks itself done after a parse error, which
    // left the quickbar spinning and the star disabled for good.
    localStorage.setItem(KEY, "{not json");
    const { useQuickbarHydrated, useQuickbarStore } = loadFresh();
    function Probe() {
      return <span>{`hydrated: ${String(useQuickbarHydrated())}`}</span>;
    }
    render(<Probe />);

    expect(await screen.findByText("hydrated: true")).toBeInTheDocument();
    expect(useQuickbarStore.getState().items).toEqual({});
    // And it recovers: the next change overwrites the unreadable value.
    act(() => useQuickbarStore.getState().addItem(34));
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").state.items).toEqual({
      34: null,
    });
  });

  it("works in memory in a browser without storage", async () => {
    jest.doMock("zustand/middleware", () => {
      const actual =
        jest.requireActual<Record<string, unknown>>("zustand/middleware");
      return { ...actual, createJSONStorage: () => undefined };
    });
    const { useQuickbarHydrated, useQuickbarStore } = loadFresh();
    jest.dontMock("zustand/middleware");
    function Probe() {
      return <span>{`hydrated: ${String(useQuickbarHydrated())}`}</span>;
    }
    render(<Probe />);

    expect(await screen.findByText("hydrated: true")).toBeInTheDocument();
    act(() => useQuickbarStore.getState().addItem(34));
    expect(useQuickbarStore.getState().items).toEqual({ 34: null });
  });

  it("listens for other tabs once, however many components ask", async () => {
    const listen = jest.spyOn(window, "addEventListener");
    const { useQuickbarHydrated, useQuickbarStore } = loadFresh();
    const rehydrate = jest.spyOn(useQuickbarStore.persist, "rehydrate");
    function Probe({ name }: { name: string }) {
      return <span>{`${name}: ${String(useQuickbarHydrated())}`}</span>;
    }
    render(
      <>
        <Probe name="sidebar" />
        <Probe name="quickbar" />
        <Probe name="star" />
      </>,
    );
    await screen.findByText("star: true");

    expect(
      listen.mock.calls.filter(([type]) => type === "storage"),
    ).toHaveLength(1);
    rehydrate.mockClear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(rehydrate).toHaveBeenCalledTimes(1);
  });

  it("keeps this window's tab when another tab saves", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: { folders: {}, items: {}, view: "quickbar" },
        version: 1,
      }),
    );
    const { useQuickbarHydrated, useQuickbarStore } = loadFresh();
    function Probe() {
      return <span>{`hydrated: ${String(useQuickbarHydrated())}`}</span>;
    }
    render(<Probe />);
    await screen.findByText("hydrated: true");
    // The first load restores the tab the reader left in view…
    expect(useQuickbarStore.getState().view).toBe("quickbar");

    act(() => useQuickbarStore.getState().setView("groups"));
    // …another window saves, with its own sidebar on the quickbar…
    localStorage.setItem(
      KEY,
      JSON.stringify({
        state: { folders: {}, items: { 35: null }, view: "quickbar" },
        version: 1,
      }),
    );
    await act(() => useQuickbarStore.persist.rehydrate());

    // …and this window takes its items, but not its tab.
    expect(useQuickbarStore.getState().items).toEqual({ 35: null });
    expect(useQuickbarStore.getState().view).toBe("groups");
  });
});
