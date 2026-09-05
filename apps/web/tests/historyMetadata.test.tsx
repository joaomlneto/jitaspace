import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";

jest.mock("@mantine/core", () => ({ Loader: () => null }));

// Mock each client component so rendering the server page wrappers doesn't pull
// in React Query / Mantine / the Prisma-backed history actions.
jest.mock("~/app/history/type/[typeId]/page.client", () => ({
  default: () => null,
}));
jest.mock("~/app/history/build/[build]/page.client", () => ({
  default: () => null,
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
