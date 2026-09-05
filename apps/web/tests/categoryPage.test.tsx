import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The category page is an async server component: it reads params (a Promise),
// loads a category from prisma (wrapped in a "use cache" helper), renders its
// groups, and calls notFound() on error. Its `generateMetadata` twin runs the
// same read to build the title and the canonical. Both are exercised here,
// because the two guard the id differently on purpose — see the `0` cases.
// ---------------------------------------------------------------------------

const mockFindUniqueOrThrow =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockNotFound = jest.fn((..._args: unknown[]) => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("~/lib/db", () => ({
  prisma: {
    category: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
  },
}));

jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

// The shared __mocks__/@jitaspace/ui stub exports neither of the two
// components this page imports, so an undefined element type would crash the
// render before any assertion ran.
jest.mock("@jitaspace/ui", () => ({
  CategoryBreadcrumbs: ({ categoryId }: { categoryId: number }) => (
    <div data-testid="breadcrumbs">{`Breadcrumbs ${categoryId}`}</div>
  ),
  GroupAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

// Resolve the async server component to plain JSX. `Page` returns a
// <Suspense> wrapping the async <PageContent>; jsdom's renderer will not await
// an async component, so we pull the inner element out, invoke it directly to
// get its resolved tree, and render that. Invoking `Page` first also exercises
// the Suspense wrapper itself.
async function resolveServerTree(categoryId: string) {
  const Page = require("~/app/category/[categoryId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ categoryId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

async function renderPage(categoryId = "7") {
  const tree = await resolveServerTree(categoryId);
  return render(
    <MantineProvider>
      <Suspense fallback={<div>loading</div>}>{tree}</Suspense>
    </MantineProvider>,
  );
}

async function metadataFor(categoryId: string) {
  const { generateMetadata } = require("~/app/category/[categoryId]/page") as {
    generateMetadata: (a: {
      params: Promise<{ categoryId: string }>;
    }) => Promise<{ title?: string; alternates?: { canonical?: string } }>;
  };
  return generateMetadata({ params: Promise.resolve({ categoryId }) });
}

describe("Category Page", () => {
  beforeEach(() => {
    mockFindUniqueOrThrow.mockReset();
    mockNotFound.mockClear();
  });

  it("renders the category name, breadcrumbs and alphabetically-sorted groups", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      categoryId: 7,
      name: "Module",
      groups: [
        { groupId: 2, name: "Shield Extender" },
        { groupId: 1, name: "Armor Plate" },
        { groupId: 3, name: "Warp Scrambler" },
      ],
    });

    await renderPage("7");

    await waitFor(() => expect(screen.getByText("Module")).toBeInTheDocument());
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent(
      "Breadcrumbs 7",
    );
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 7 } }),
    );

    const names = screen
      .getAllByText(/Armor Plate|Shield Extender|Warp Scrambler/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Armor Plate", "Shield Extender", "Warp Scrambler"]);
  });

  // Measured on production 2026-09-02 for the sibling /type route: /type/587,
  // /type/0587 and /type/587.0 all returned 200 serving the same document.
  // /category behaved identically, and Search Console counts those extra URLs
  // under "Duplicate without user-selected canonical".
  it.each(["0587", "587.0", "+587", "abc", ""])(
    "404s the non-canonical id %p without querying",
    async (categoryId) => {
      await expect(resolveServerTree(categoryId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it("calls notFound() when the category lookup throws", async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error("db error"));

    await expect(resolveServerTree("7")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // The page and its generateMetadata disagree about `0` on purpose: the page
  // has always rendered /category/0 — a real non-deleted row the sitemap
  // advertises, since that block carries no `gt: 0` filter — while the
  // metadata's pre-existing falsy guard rejected it. These two cases pin both
  // halves so a later "tidy-up" to one shared parser reddens here instead of
  // silently 404ing a URL the sitemap points at.
  it("still serves category 0, which the sitemap advertises", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      categoryId: 0,
      name: "Category Zero",
      groups: [],
    });

    await renderPage("0");

    await waitFor(() =>
      expect(screen.getByText("Category Zero")).toBeInTheDocument(),
    );
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 0 } }),
    );
  });

  it("emits no metadata for category 0", async () => {
    expect(await metadataFor("0")).toEqual({});
    expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("points the canonical at the parsed id, relative to metadataBase", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
      categoryId: 7,
      name: "Module",
      groups: [],
    });

    expect(await metadataFor("7")).toEqual(
      expect.objectContaining({
        title: "Module",
        alternates: { canonical: "/category/7" },
      }),
    );
  });

  it.each(["0587", "587.0", "+587", "abc", ""])(
    "emits no metadata for the non-canonical id %p",
    async (categoryId) => {
      expect(await metadataFor(categoryId)).toEqual({});
      expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
    },
  );

  it("emits no metadata when the lookup throws, so a failed read is never canonicalised", async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error("db error"));

    expect(await metadataFor("7")).toEqual({});
  });
});
