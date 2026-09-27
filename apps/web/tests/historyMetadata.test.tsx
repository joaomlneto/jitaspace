import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import { NuqsAdapter } from "nuqs/adapters/react";

import type { BuildPage } from "~/lib/history";

jest.mock("@mantine/core", () => ({ Loader: () => null }));

// Mock each client component so rendering the server page wrappers doesn't pull
// in React Query / Mantine / the Prisma-backed history actions.
jest.mock("~/app/history/type/[typeId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/history/build/[build]/page.client", () => ({
  default: () => null,
}));
// The build page reads its data on the server; stub the (Prisma-backed) read.
const mockGetCachedBuildPage = jest.fn<(build: number) => Promise<unknown>>(
  () => Promise.resolve(null),
);
jest.mock("~/app/history/build/[build]/data", () => ({
  getCachedBuildPage: (build: number) => mockGetCachedBuildPage(build),
}));
jest.mock("~/app/history/[entityType]/[id]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/history/skin/[skinId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/history/skinMaterial/[skinMaterialId]/page.client", () => ({
  default: () => null,
}));

const rp = <T,>(o: T): Promise<T> => Promise.resolve(o);

const cases = [
  {
    mod: "~/app/history/type/[typeId]/page",
    params: { typeId: "587" },
    title: "Type 587 — Change History",
    needle: "587",
    canonical: "/history/type/587",
    bad: [{ typeId: "0587" }, { typeId: "587.0" }, { typeId: "0" }],
  },
  {
    mod: "~/app/history/build/[build]/page",
    params: { build: "3383521" },
    title: "Build 3383521 — Change History",
    needle: "3383521",
    canonical: "/history/build/3383521",
    bad: [{ build: "03383521" }, { build: "3383521.0" }, { build: "latest" }],
  },
  {
    mod: "~/app/history/[entityType]/[id]/page",
    params: { entityType: "group", id: "25" },
    title: "group 25 — Change History",
    needle: "group",
    canonical: "/history/group/25",
    // The kind is matched verbatim against `Entity.kind`, so a re-cased
    // spelling is a duplicate of the real page, not a page of its own.
    bad: [
      { entityType: "group", id: "025" },
      { entityType: "GROUP", id: "25" },
      { entityType: "Group", id: "25" },
    ],
  },
  {
    mod: "~/app/history/skin/[skinId]/page",
    params: { skinId: "42" },
    title: "SKIN 42 — Change History",
    needle: "42",
    canonical: "/history/skin/42",
    bad: [{ skinId: "042" }, { skinId: "+42" }],
  },
  {
    mod: "~/app/history/skinMaterial/[skinMaterialId]/page",
    params: { skinMaterialId: "7" },
    title: "SKIN Material 7 — Change History",
    needle: "7",
    canonical: "/history/skinMaterial/7",
    bad: [{ skinMaterialId: "7e0" }, { skinMaterialId: " 7" }],
  },
] as const;

interface PageModule {
  generateMetadata: (a: {
    params: Promise<Record<string, string>>;
  }) => Promise<{
    title?: string;
    description?: string;
    alternates?: { canonical?: string };
  }>;
  default: (p: { params: Promise<Record<string, string>> }) => unknown;
}

describe("history page metadata + wrappers", () => {
  for (const c of cases) {
    it(`${c.mod} generates metadata and renders`, async () => {
      const mod = (await import(c.mod)) as PageModule;
      const meta = await mod.generateMetadata({ params: rp(c.params) });
      expect(meta.title).toBe(c.title);
      expect(meta.description).toContain(c.needle);
      // Relative, and built from the parsed id — interpolating the raw segment
      // would put the duplicate spelling back into the canonical it declares.
      expect(meta.alternates?.canonical).toBe(c.canonical);

      const Page = mod.default as React.ComponentType<{
        params: Promise<Record<string, string>>;
      }>;
      // Renders the Suspense wrapper (fallback shows while the async child loads).
      expect(() => render(<Page params={rp(c.params)} />)).not.toThrow();
    });

    // Metadata and page must reject in lockstep: a spelling `generateMetadata`
    // refuses to canonicalise but the page still serves would be a 200 with no
    // metadata at all — strictly worse than the duplicate it replaced.
    it(`${c.mod} 404s the spellings it refuses to canonicalise`, async () => {
      const mod = (await import(c.mod)) as PageModule;
      for (const params of c.bad) {
        expect(await mod.generateMetadata({ params: rp(params) })).toEqual({});

        // The default export is the sync <Suspense> wrapper; its child is the
        // async server component that awaits the params, so invoke that.
        const wrapper = mod.default({ params: rp(params) }) as {
          props: {
            children: {
              type: (p: {
                params: Promise<Record<string, string>>;
              }) => Promise<unknown>;
            };
          };
        };
        await expect(
          wrapper.props.children.type({ params: rp(params) }),
        ).rejects.toThrow();
      }
    });
  }
});

describe("build page server read", () => {
  // The default export is the sync <Suspense> wrapper; render its async child.
  const renderContent = async (build: string) => {
    const mod = (await import("~/app/history/build/[build]/page")) as {
      default: (p: { params: Promise<{ build: string }> }) => {
        props: {
          children: {
            type: (p: {
              params: Promise<{ build: string }>;
            }) => Promise<ReactElement<{ children: ReactElement }>>;
          };
        };
      };
    };
    const wrapper = mod.default({ params: rp({ build }) });
    return wrapper.props.children.type({ params: rp({ build }) });
  };

  it("prerenders only a placeholder the page 404s before reading any data", async () => {
    const mod = (await import("~/app/history/build/[build]/page")) as {
      generateStaticParams: () => { build: string }[];
    };
    const params = mod.generateStaticParams();
    expect(params.length).toBeGreaterThan(0); // Cache Components rejects []
    for (const { build } of params) {
      mockGetCachedBuildPage.mockClear();
      await expect(renderContent(build)).rejects.toThrow();
      // CI's build has no history DB, so the placeholder must not query it.
      expect(mockGetCachedBuildPage).not.toHaveBeenCalled();
    }
  });

  it("404s a well-formed build number the history does not have", async () => {
    mockGetCachedBuildPage.mockResolvedValueOnce(null);
    await expect(renderContent("3383521")).rejects.toThrow();
    expect(mockGetCachedBuildPage).toHaveBeenCalledWith(3383521);
  });

  it("hands the page data to the client under nuqs's React adapter", async () => {
    const data: BuildPage = {
      build: 3383521,
      date: "2026-06-08",
      changes: [],
      typeNames: {},
      files: { added: [], changed: [], removed: [] },
      strings: {},
    };
    mockGetCachedBuildPage.mockResolvedValueOnce(data);

    const element = await renderContent("3383521");

    // Not the Next adapter: its useSearchParams() drops the lists out of the
    // cached page, which would then hold only the loader.
    expect(element.type).toBe(NuqsAdapter);
    expect(element.props.children.props).toEqual({ data });
  });
});
