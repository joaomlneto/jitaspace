import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";

import type { NewsItem } from "~/config/news";

// NewsBannerCard renders internal links through next/link.
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

const STORAGE_KEY = "jitaspace/test-news";

function makeItem(
  overrides: Partial<NewsItem> & Pick<NewsItem, "id" | "title">,
): NewsItem {
  return { message: "Message body", date: "2026-01-15", ...overrides };
}

describe("news", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("NewsCarousel", () => {
    function renderCarousel(items: NewsItem[]) {
      const { NewsCarousel } = require("~/components/News");
      return render(
        <MantineProvider>
          <NewsCarousel items={items} storageKey={STORAGE_KEY} />
        </MantineProvider>,
      );
    }

    it("renders an active item with title, message, formatted date and external CTA", async () => {
      renderCarousel([
        makeItem({
          id: "feature-x",
          title: "Feature X",
          color: "#e6923f",
          image: "/x.jpg",
          link: {
            label: "Learn more",
            href: "https://example.com",
            external: true,
          },
        }),
      ]);

      expect(await screen.findByText("Feature X")).toBeInTheDocument();
      expect(screen.getByText("Message body")).toBeInTheDocument();
      expect(screen.getByText("Jan 15, 2026")).toBeInTheDocument();
      expect(screen.getByText("Learn more")).toBeInTheDocument();
    });

    it("renders an internal-link item and an image-less (colour fallback) item", async () => {
      renderCarousel([
        makeItem({
          id: "internal",
          title: "Internal item",
          link: { label: "Open tool", href: "/tool" },
        }),
        makeItem({ id: "plain", title: "Plain item", color: "pink" }),
      ]);

      expect(await screen.findByText("Internal item")).toBeInTheDocument();
      expect(screen.getByText("Open tool")).toBeInTheDocument();
      expect(screen.getByText("Plain item")).toBeInTheDocument();
    });

    it("hides items scheduled for the future and shows published ones", async () => {
      renderCarousel([
        makeItem({ id: "live", title: "Live item" }),
        makeItem({
          id: "future",
          title: "Future item",
          publishAt: "2999-01-01T00:00:00Z",
        }),
      ]);

      expect(await screen.findByText("Live item")).toBeInTheDocument();
      expect(screen.queryByText("Future item")).not.toBeInTheDocument();
    });

    it("hides expired items", async () => {
      renderCarousel([
        makeItem({ id: "live2", title: "Still live" }),
        makeItem({
          id: "old",
          title: "Old item",
          expiresAt: "2000-01-01T00:00:00Z",
        }),
      ]);

      expect(await screen.findByText("Still live")).toBeInTheDocument();
      expect(screen.queryByText("Old item")).not.toBeInTheDocument();
    });

    it("dismisses an item and persists the dismissal", async () => {
      renderCarousel([makeItem({ id: "dismiss-me", title: "Dismiss me" })]);
      expect(await screen.findByText("Dismiss me")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("Dismiss: Dismiss me"));

      await waitFor(() =>
        expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument(),
      );
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain("dismiss-me");
    });
  });

  describe("useDismissedNews", () => {
    const items: NewsItem[] = [
      { id: "a", title: "A", message: "a" },
      { id: "b", title: "B", message: "b" },
    ];

    it("dismisses a single item and restores all on reset", async () => {
      const { useDismissedNews } = require("~/components/News");
      const { result } = renderHook(() =>
        useDismissedNews({ items, storageKey: STORAGE_KEY }),
      );

      await waitFor(() => expect(result.current.activeItems).toHaveLength(2));

      act(() => result.current.dismiss("a"));
      await waitFor(() =>
        expect(
          result.current.activeItems.map((i: NewsItem) => i.id),
        ).toEqual(["b"]),
      );
      expect(result.current.dismissedIds).toContain("a");

      act(() => result.current.reset());
      await waitFor(() => expect(result.current.activeItems).toHaveLength(2));
      expect(result.current.dismissedIds).toHaveLength(0);
    });
  });
});
