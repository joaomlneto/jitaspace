import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { NewsItem } from "~/config/news";
import type { HistoryIndex, LatestChangedBuild } from "~/lib/history";
import {
  PatchNotesNewsCarousel,
  patchNotesNewsItem,
} from "~/components/PatchNotes";
import { latestChangedBuild } from "~/lib/history";

// The card links to the build diff through next/link.
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

const PATCH_KEY = "jitaspace/test-patch-notes";
const NEWS_KEY = "jitaspace/test-news";

const build = (
  overrides: Partial<LatestChangedBuild> = {},
): LatestChangedBuild => ({
  build: 3376632,
  date: "2026-08-14",
  changeCount: 12345,
  ...overrides,
});

function renderCarousel(
  latest: LatestChangedBuild | null,
  items: NewsItem[] = [],
) {
  return render(
    <MantineProvider>
      <PatchNotesNewsCarousel
        latest={latest}
        items={items}
        storageKey={NEWS_KEY}
        patchNotesStorageKey={PATCH_KEY}
      />
    </MantineProvider>,
  );
}

describe("latestChangedBuild", () => {
  const index = (builds: HistoryIndex["builds"]): HistoryIndex => ({
    generatedAt: "2026-08-14T00:00:00.000Z",
    entityTypes: ["type"],
    builds,
    entityCountsByType: { type: 1 },
  });

  it("returns the newest build that recorded changes", () => {
    expect(
      latestChangedBuild(
        index([
          { build: 100, date: "2026-01-01", changeCount: 5 },
          { build: 300, date: "2026-03-01", changeCount: 7 },
          { build: 200, date: "2026-02-01", changeCount: 9 },
        ]),
      ),
    ).toEqual({ build: 300, date: "2026-03-01", changeCount: 7 });
  });

  it("skips builds with no changes", () => {
    expect(
      latestChangedBuild(
        index([
          { build: 100, date: "2026-01-01", changeCount: 5 },
          { build: 400, date: "2026-04-01", changeCount: 0 },
        ]),
      ),
    ).toEqual({ build: 100, date: "2026-01-01", changeCount: 5 });
  });

  it("returns null for an empty, all-quiet or missing index", () => {
    expect(latestChangedBuild(index([]))).toBeNull();
    expect(
      latestChangedBuild(index([{ build: 1, date: null, changeCount: 0 }])),
    ).toBeNull();
    expect(latestChangedBuild(null)).toBeNull();
  });
});

describe("patchNotesNewsItem", () => {
  it("maps a diff onto a news card with hero art and a link to it", () => {
    expect(patchNotesNewsItem(build())).toMatchObject({
      id: "patch-notes-3376632",
      title: "Patch Notes: Build 3376632",
      date: "2026-08-14",
      image: "/wallpapers/jita-4-4-banner.jpeg",
      link: { label: "See what changed", href: "/history/build/3376632" },
    });
  });

  it("groups the count in a fixed locale and pluralises it", () => {
    expect(patchNotesNewsItem(build()).message).toMatch(/^12,345 changes /);
    expect(patchNotesNewsItem(build({ changeCount: 1 })).message).toMatch(
      /^1 change /,
    );
  });

  it("prefers the generated summary over the static wording", () => {
    expect(
      patchNotesNewsItem(
        build({ summary: "Adds four Command Carriers and 208 SKINs." }),
      ).message,
    ).toBe("Adds four Command Carriers and 208 SKINs.");
  });

  it("falls back to the static wording when no summary exists yet", () => {
    expect(patchNotesNewsItem(build()).message).toMatch(
      /^12,345 changes to EVE's static data/,
    );
  });

  it("omits the date badge when the build has none", () => {
    expect(patchNotesNewsItem(build({ date: null }))).not.toHaveProperty(
      "date",
    );
  });
});

describe("PatchNotesNewsCarousel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the patch-notes card alongside the curated news", async () => {
    renderCarousel(build(), [
      {
        id: "expansion",
        title: "EVE Expansion: Cradle of War",
        message: "Military Campaigns and more.",
      },
    ]);

    expect(
      await screen.findByText("EVE Expansion: Cradle of War"),
    ).toBeInTheDocument();
    expect(screen.getByText("Patch Notes: Build 3376632")).toBeInTheDocument();
    expect(screen.getByText("Aug 14, 2026")).toBeInTheDocument();
    expect(screen.getByText("See what changed").closest("a")).toHaveAttribute(
      "href",
      "/history/build/3376632",
    );
  });

  it("renders no patch-notes card when there is no recorded diff", async () => {
    renderCarousel(null, [
      { id: "expansion", title: "Only news", message: "Body" },
    ]);

    expect(await screen.findByText("Only news")).toBeInTheDocument();
    expect(screen.queryByText(/Patch Notes/)).not.toBeInTheDocument();
  });

  it("hides on dismiss and remembers the build that was dismissed", async () => {
    renderCarousel(build());

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Dismiss: Patch Notes: Build 3376632",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText(/Patch Notes/)).not.toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(PATCH_KEY)).toBe("3376632");
  });

  it("stays hidden for the build that was dismissed", async () => {
    window.localStorage.setItem(PATCH_KEY, JSON.stringify(3376632));
    renderCarousel(build(), [
      { id: "expansion", title: "Only news", message: "Body" },
    ]);

    expect(await screen.findByText("Only news")).toBeInTheDocument();
    expect(screen.queryByText(/Patch Notes/)).not.toBeInTheDocument();
  });

  it("comes back once a newer build exists", async () => {
    window.localStorage.setItem(PATCH_KEY, JSON.stringify(3376632));
    renderCarousel(build({ build: 3400000 }));

    expect(
      await screen.findByText("Patch Notes: Build 3400000"),
    ).toBeInTheDocument();
  });

  it("treats a non-numeric stored value as never dismissed", async () => {
    window.localStorage.setItem(PATCH_KEY, JSON.stringify("nonsense"));
    renderCarousel(build());

    expect(
      await screen.findByText("Patch Notes: Build 3376632"),
    ).toBeInTheDocument();
  });

  it("dismissing the patch notes leaves the curated news alone", async () => {
    renderCarousel(build(), [
      { id: "expansion", title: "Curated item", message: "Body" },
    ]);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Dismiss: Patch Notes: Build 3376632",
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText(/Patch Notes/)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Curated item")).toBeInTheDocument();
    // The curated dismissal list stays empty — `useLocalStorage` writes its `[]`
    // default on mount, so assert the contents, not the key's absence.
    expect(JSON.parse(window.localStorage.getItem(NEWS_KEY) ?? "[]")).toEqual(
      [],
    );
  });
});
