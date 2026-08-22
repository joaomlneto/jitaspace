import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { HistoryIndex, LatestChangedBuild } from "~/lib/history";
import { LatestPatchNotesBanner } from "~/components/PatchNotes";
import { latestChangedBuild } from "~/lib/history";

// The banner links to the build diff through next/link.
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

const STORAGE_KEY = "jitaspace/test-patch-notes";

function renderBanner(latest: LatestChangedBuild | null) {
  return render(
    <MantineProvider>
      <LatestPatchNotesBanner latest={latest} storageKey={STORAGE_KEY} />
    </MantineProvider>,
  );
}

const build = (
  overrides: Partial<LatestChangedBuild> = {},
): LatestChangedBuild => ({
  build: 3376632,
  date: "2026-08-14",
  changeCount: 12345,
  ...overrides,
});

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

describe("LatestPatchNotesBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("announces the build, its change count and date, and links to the diff", async () => {
    renderBanner(build());

    expect(
      await screen.findByText("Patch notes — EVE build 3376632"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/12,345 changes to EVE's static data on Aug 14, 2026\./),
    ).toBeInTheDocument();
    expect(screen.getByText("View the diff").closest("a")).toHaveAttribute(
      "href",
      "/history/build/3376632",
    );
  });

  it("omits the date when the build has none, and singularises one change", async () => {
    renderBanner(build({ date: null, changeCount: 1 }));

    expect(
      await screen.findByText("1 change to EVE's static data."),
    ).toBeInTheDocument();
  });

  it("renders nothing when there is no recorded diff", () => {
    renderBanner(null);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides on dismiss and remembers the build that was dismissed", async () => {
    renderBanner(build());

    fireEvent.click(
      await screen.findByRole("button", { name: "Hide until the next build" }),
    );

    await waitFor(() =>
      expect(screen.queryByText("View the diff")).not.toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("3376632");
  });

  it("stays hidden for the build that was dismissed", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(3376632));
    renderBanner(build());

    await waitFor(() =>
      expect(screen.queryByText("View the diff")).not.toBeInTheDocument(),
    );
  });

  it("comes back once a newer build exists", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(3376632));
    renderBanner(build({ build: 3400000 }));

    expect(
      await screen.findByText("Patch notes — EVE build 3400000"),
    ).toBeInTheDocument();
  });

  it("treats a non-numeric stored value as never dismissed", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify("nonsense"));
    renderBanner(build());

    expect(
      await screen.findByText("Patch notes — EVE build 3376632"),
    ).toBeInTheDocument();
  });
});
