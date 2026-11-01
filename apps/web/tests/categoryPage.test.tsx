import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The category page is an async server component: it reads params (a Promise),
// loads a category from prisma (wrapped in a "use cache" helper), renders its
// groups, and calls notFound() for a category that does not exist. A failed
// read throws instead: the route is cached whole (ISR), so a 404 it rendered
// for a database error would be stored. Its `generateMetadata` twin runs the
// same read to build the title and the canonical. Both are exercised here,
// because the two guard the id differently on purpose — see the `0` cases.
// ---------------------------------------------------------------------------

const mockFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockNotFound = jest.fn((..._args: unknown[]) => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("~/lib/db", () => ({
  prisma: {
    category: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
  cacheTag: () => undefined,
}));

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

// Stub the breadcrumbs and the group links this page renders, so the assertions
// see plain markers instead of the real components.
jest.mock("~/components/Breadcrumbs", () => ({
  CategoryBreadcrumbs: ({ categoryId }: { categoryId: number }) => (
    <div data-testid="breadcrumbs">{`Breadcrumbs ${categoryId}`}</div>
  ),
}));

jest.mock("~/components/Anchor", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/components/Anchor",
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
    mockFindUnique.mockReset();
    mockNotFound.mockClear();
  });

  it("renders the category name, breadcrumbs and alphabetically-sorted groups", async () => {
    mockFindUnique.mockResolvedValue({
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
    expect(mockFindUnique).toHaveBeenCalledWith(
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
      expect(mockFindUnique).not.toHaveBeenCalled();
    },
  );

  it("calls notFound() for a category that does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(resolveServerTree("7")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // The route is cached whole, so a 404 rendered for a failed read would be
  // stored and served after the database recovers. The error must propagate.
  it("lets a failed lookup throw instead of rendering a 404", async () => {
    mockFindUnique.mockRejectedValue(new Error("db error"));

    await expect(resolveServerTree("7")).rejects.toThrow("db error");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  // `0` is a real category, so the build's placeholder must be an id the
  // parser refuses: it prerenders as a 404 without reaching the database,
  // which CI's build cannot.
  it("lists one placeholder param that 404s before any query", async () => {
    const { generateStaticParams } =
      require("~/app/category/[categoryId]/page") as {
        generateStaticParams: () => { categoryId: string }[];
      };
    const params = generateStaticParams();
    expect(params).toEqual([{ categoryId: "-1" }]);

    await expect(resolveServerTree(params[0]!.categoryId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // /category/0 is "#System", a real non-deleted row the sitemap advertises.
  // The page and its metadata must both accept it: the metadata used to reject
  // 0, so the URL rendered with the bare site title and no canonical.
  it("still serves category 0, which the sitemap advertises", async () => {
    mockFindUnique.mockResolvedValue({
      categoryId: 0,
      name: "Category Zero",
      groups: [],
    });

    await renderPage("0");

    await waitFor(() =>
      expect(screen.getByText("Category Zero")).toBeInTheDocument(),
    );
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 0 } }),
    );
  });

  it("titles and canonicalises category 0 like any other category", async () => {
    mockFindUnique.mockResolvedValue({
      categoryId: 0,
      name: "#System",
      groups: [],
    });

    expect(await metadataFor("0")).toEqual(
      expect.objectContaining({
        title: "#System",
        alternates: { canonical: "/category/0" },
      }),
    );
  });

  it("points the canonical at the parsed id, relative to metadataBase", async () => {
    mockFindUnique.mockResolvedValue({
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
      expect(mockFindUnique).not.toHaveBeenCalled();
    },
  );

  it("emits no metadata for a category that does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    expect(await metadataFor("7")).toEqual({});
  });

  // Generic metadata for a failed read would be stored with the page.
  it("lets a failed lookup throw instead of emitting generic metadata", async () => {
    mockFindUnique.mockRejectedValue(new Error("db error"));

    await expect(metadataFor("7")).rejects.toThrow("db error");
  });
});
