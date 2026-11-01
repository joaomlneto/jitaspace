import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The group page is an async server component. It reads params (a Promise),
// loads a group from prisma (wrapped in a "use cache" helper), renders its
// types, and calls notFound() for a group that does not exist. A failed read
// throws instead: the route is cached whole (ISR), so a 404 it rendered for a
// database error would be stored. We mock prisma, next/cache,
// next/navigation, the UI anchors/avatars and the breadcrumbs component.
// ---------------------------------------------------------------------------

const mockFindUnique = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockNotFound = jest.fn((..._args: unknown[]) => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("~/lib/db", () => ({
  prisma: {
    group: {
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

jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: ({ typeId }: { typeId: number }) => (
    <span>{`TypeAvatar ${typeId}`}</span>
  ),
}));

jest.mock("~/components/Anchor", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "../__mocks__/components/Anchor",
  ),
  TypeAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

jest.mock("~/components/Breadcrumbs", () => ({
  GroupBreadcrumbs: ({ groupId }: { groupId: number }) => (
    <div data-testid="breadcrumbs">{`Breadcrumbs ${groupId}`}</div>
  ),
}));

// Resolve the async server component to plain JSX. `Page` returns a
// <Suspense> wrapping the async <PageContent>; jsdom's renderer will not await
// an async component, so we pull the inner element out, invoke it directly to
// get its resolved tree, and render that. Invoking `Page` first also exercises
// the Suspense wrapper itself.
async function resolveServerTree(groupId: string) {
  const Page = require("~/app/group/[groupId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ groupId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

async function renderPage(groupId = "25") {
  const tree = await resolveServerTree(groupId);
  return render(
    <MantineProvider>
      <Suspense fallback={<div>loading</div>}>{tree}</Suspense>
    </MantineProvider>,
  );
}

describe("Group Page", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockNotFound.mockClear();
  });

  it("renders the group name, breadcrumbs and alphabetically-sorted types", async () => {
    mockFindUnique.mockResolvedValue({
      groupId: 25,
      name: "Frigate",
      types: [
        { typeId: 2, name: "Rifter" },
        { typeId: 1, name: "Atron" },
        { typeId: 3, name: "Tristan" },
      ],
    });

    await renderPage("25");

    await waitFor(() =>
      expect(screen.getByText("Frigate")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent(
      "Breadcrumbs 25",
    );
    expect(screen.getByText("Types")).toBeInTheDocument();

    // All three types render
    expect(screen.getByText("Rifter")).toBeInTheDocument();
    expect(screen.getByText("Atron")).toBeInTheDocument();
    expect(screen.getByText("Tristan")).toBeInTheDocument();
    expect(screen.getByText("TypeAvatar 1")).toBeInTheDocument();

    // prisma queried with the numeric groupId
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: 25 } }),
    );

    // Verify alphabetical ordering in the DOM (Atron < Rifter < Tristan)
    const names = screen
      .getAllByText(/Atron|Rifter|Tristan/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Atron", "Rifter", "Tristan"]);
  });

  it("renders a group with no types", async () => {
    mockFindUnique.mockResolvedValue({
      groupId: 99,
      name: "Empty Group",
      types: [],
    });

    await renderPage("99");

    await waitFor(() =>
      expect(screen.getByText("Empty Group")).toBeInTheDocument(),
    );
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.queryByText(/TypeAvatar/)).not.toBeInTheDocument();
  });

  it("falls back to an empty type list when types is nullish", async () => {
    mockFindUnique.mockResolvedValue({
      groupId: 5,
      name: "Nullish Types",
      types: null,
    });

    await renderPage("5");

    await waitFor(() =>
      expect(screen.getByText("Nullish Types")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/TypeAvatar/)).not.toBeInTheDocument();
  });

  // The page had no numeric guard, so every alternative spelling of an id
  // rendered the same document at 200 — Search Console counts those as
  // "Duplicate without user-selected canonical". `"0"` stays accepted because
  // it is a real non-deleted row the sitemap advertises.
  it.each(["0587", "587.0", "+587", "abc", ""])(
    "404s the non-canonical id %p without querying",
    async (groupId) => {
      await expect(resolveServerTree(groupId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(mockFindUnique).not.toHaveBeenCalled();
    },
  );

  it("still serves group 0, which the sitemap advertises", async () => {
    mockFindUnique.mockResolvedValue({
      groupId: 0,
      name: "Group Zero",
      types: [],
    });

    await renderPage("0");

    await waitFor(() =>
      expect(screen.getByText("Group Zero")).toBeInTheDocument(),
    );
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: 0 } }),
    );
  });

  // The metadata used to reject 0 while the page accepted it, so /group/0 —
  // "#System" — rendered with the bare site title and no canonical.
  it("titles and canonicalises group 0 like any other group", async () => {
    mockFindUnique.mockResolvedValue({
      groupId: 0,
      name: "#System",
      types: [],
    });
    const { generateMetadata } = require("~/app/group/[groupId]/page");

    expect(
      await generateMetadata({ params: Promise.resolve({ groupId: "0" }) }),
    ).toEqual(
      expect.objectContaining({
        title: "#System",
        alternates: { canonical: "/group/0" },
      }),
    );
  });

  it("calls notFound() for a group that does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(resolveServerTree("404")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  // The route is cached whole, so a 404 rendered for a failed read would be
  // stored and served after the database recovers. The error must propagate.
  it("lets a failed lookup throw instead of rendering a 404", async () => {
    mockFindUnique.mockRejectedValue(new Error("db error"));

    await expect(resolveServerTree("404")).rejects.toThrow("db error");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("lets a failed lookup throw out of the metadata too", async () => {
    mockFindUnique.mockRejectedValue(new Error("db error"));
    const { generateMetadata } = require("~/app/group/[groupId]/page") as {
      generateMetadata: (a: {
        params: Promise<{ groupId: string }>;
      }) => Promise<unknown>;
    };

    await expect(
      generateMetadata({ params: Promise.resolve({ groupId: "25" }) }),
    ).rejects.toThrow("db error");
  });

  // `0` is a real group, so the build's placeholder must be an id the parser
  // refuses: it prerenders as a 404 without reaching the database, which CI's
  // build cannot.
  it("lists one placeholder param that 404s before any query", async () => {
    const { generateStaticParams } = require("~/app/group/[groupId]/page") as {
      generateStaticParams: () => { groupId: string }[];
    };
    const params = generateStaticParams();
    expect(params).toEqual([{ groupId: "-1" }]);

    await expect(resolveServerTree(params[0]!.groupId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
