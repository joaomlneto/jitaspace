import "@testing-library/jest-dom/jest-globals";

import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
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
});
