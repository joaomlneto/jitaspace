import { describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";

jest.mock("@mantine/core", () => ({ Loader: () => null }));

// Mock each client component so rendering the server page wrappers doesn't pull
// in React Query / Mantine / sde-client.
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
  },
  {
    mod: "~/app/history/build/[build]/page",
    params: { build: "3383521" },
    title: "Build 3383521 — Change History",
    needle: "3383521",
  },
  {
    mod: "~/app/history/[entityType]/[id]/page",
    params: { entityType: "group", id: "25" },
    title: "group 25 — Change History",
    needle: "group",
  },
  {
    mod: "~/app/history/skin/[skinId]/page",
    params: { skinId: "42" },
    title: "SKIN 42 — Change History",
    needle: "42",
  },
  {
    mod: "~/app/history/skinMaterial/[skinMaterialId]/page",
    params: { skinMaterialId: "7" },
    title: "SKIN Material 7 — Change History",
    needle: "7",
  },
] as const;

describe("history page metadata + wrappers", () => {
  for (const c of cases) {
    it(`${c.mod} generates metadata and renders`, async () => {
      const mod = (await import(c.mod)) as {
        generateMetadata: (a: {
          params: Promise<Record<string, string>>;
        }) => Promise<{ title?: string; description?: string }>;
        default: (p: { params: Promise<Record<string, string>> }) => unknown;
      };
      const meta = await mod.generateMetadata({ params: rp(c.params) });
      expect(meta.title).toBe(c.title);
      expect(meta.description).toContain(c.needle);

      const Page = mod.default as React.ComponentType<{
        params: Promise<Record<string, string>>;
      }>;
      // Renders the Suspense wrapper (fallback shows while the async child loads).
      expect(() =>
        render(<Page params={rp(c.params)} />),
      ).not.toThrow();
    });
  }
});
