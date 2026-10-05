import "@testing-library/jest-dom/jest-globals";

import Link from "next/link";
import { afterEach, describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import {
  BrowseMarketButton,
  MarketLayoutShell,
} from "~/layouts/MarketLayout/MarketLayoutShell";

const narrowMatchMedia = window.matchMedia;

/**
 * A viewport that can be widened mid-test: every media query matches once
 * widened, and the listeners `useMediaQuery` registered are told so.
 */
function emulateResizableViewport() {
  let wide = false;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  window.matchMedia = (query: string) => ({
    ...narrowMatchMedia(query),
    get matches() {
      return wide;
    },
    addEventListener: (_type: string, listener: EventListener) =>
      listeners.add(listener as never),
    removeEventListener: (_type: string, listener: EventListener) =>
      listeners.delete(listener as never),
  });
  return () => {
    wide = true;
    act(() => listeners.forEach((listener) => listener({ matches: true })));
  };
}

function Tree() {
  return (
    <nav>
      <button type="button">Minerals</button>
      <Link href="/market/34">Tritanium</Link>
    </nav>
  );
}

function renderShell() {
  return render(
    <MantineProvider>
      <MarketLayoutShell sidebar={<Tree />}>
        <BrowseMarketButton />
        <h1>Tritanium</h1>
      </MarketLayoutShell>
    </MantineProvider>,
  );
}

/** The drawer mounts through a transition, so it appears asynchronously. */
function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: "Browse market" }));
  return screen.findByRole("dialog");
}

describe("MarketLayoutShell", () => {
  afterEach(() => {
    window.matchMedia = narrowMatchMedia;
  });

  it("renders the page beside the tree sidebar", () => {
    renderShell();

    expect(
      screen.getByRole("heading", { name: "Tritanium" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("complementary", { name: "Market groups" }),
      ).getByRole("link", { name: "Tritanium" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the tree in a drawer from the page's button", async () => {
    renderShell();

    const drawer = await openDrawer();
    expect(within(drawer).getByText("Market")).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Tritanium" }),
    ).toBeInTheDocument();
  });

  it("closes the drawer when an item is picked, not when a group expands", async () => {
    renderShell();
    const drawer = await openDrawer();

    fireEvent.click(within(drawer).getByRole("button", { name: "Minerals" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("link", { name: "Tritanium" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("closes the drawer when the viewport widens enough for the sidebar", async () => {
    const widen = emulateResizableViewport();
    renderShell();
    await openDrawer();

    // A tablet rotated to landscape: the drawer is CSS-hidden from md, so left
    // open its scroll lock and focus trap would outlive it.
    widen();

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});

describe("BrowseMarketButton", () => {
  it("renders nothing outside the market layout", () => {
    render(
      <MantineProvider>
        <BrowseMarketButton />
      </MantineProvider>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
