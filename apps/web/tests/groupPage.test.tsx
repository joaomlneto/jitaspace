import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The group page is an async server component. It reads params (a Promise),
// loads a group from prisma (wrapped in a "use cache" helper), renders its
// types, and calls notFound() on error. We mock prisma, next/cache,
// next/navigation, the UI anchors/avatars and the breadcrumbs component.
// ---------------------------------------------------------------------------

const mockFindUniqueOrThrow = jest.fn();
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("@jitaspace/db", () => ({
  prisma: {
    group: {
      findUniqueOrThrow: (...args: unknown[]) =>
        mockFindUniqueOrThrow(...args),
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

jest.mock("@jitaspace/ui", () => ({
  TypeAvatar: ({ typeId }: { typeId: number }) => (
    <span>{`TypeAvatar ${typeId}`}</span>
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
    mockFindUniqueOrThrow.mockReset();
    mockNotFound.mockClear();
  });

  it("renders the group name, breadcrumbs and alphabetically-sorted types", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
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
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: 25 } }),
    );

    // Verify alphabetical ordering in the DOM (Atron < Rifter < Tristan)
    const names = screen
      .getAllByText(/Atron|Rifter|Tristan/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Atron", "Rifter", "Tristan"]);
  });

  it("renders a group with no types", async () => {
    mockFindUniqueOrThrow.mockResolvedValue({
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
    mockFindUniqueOrThrow.mockResolvedValue({
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

  it("calls notFound() when the group lookup throws", async () => {
    mockFindUniqueOrThrow.mockRejectedValue(new Error("db error"));

    // PageContent catches the prisma error and calls notFound(), which our
    // mock turns into a thrown NEXT_NOT_FOUND.
    await expect(resolveServerTree("404")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });
});
