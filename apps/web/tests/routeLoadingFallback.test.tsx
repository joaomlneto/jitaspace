import { Suspense } from "react";
import { describe, expect, it, jest } from "@jest/globals";

import { PageSkeleton } from "~/components/PageSkeleton";

/* Loading each route's server component requires a dynamic `require` whose
   result is `any`; the unsafe-* rules below are inherent to that pattern (the
   same one existing page tests use). */

// Every server page wraps its content in <Suspense fallback={<PageSkeleton />}>,
// so the route reserves layout space while content streams in (replacing the old
// bare <Loader /> spinner that caused layout shift). Invoking a page's default
// export runs that wrapper without awaiting the async content, letting us assert
// — across every route — that the shared loading skeleton is used.

// We only assert the Suspense fallback element — never render the page content —
// so we stub out everything the page modules pull in that isn't available in the
// coverage CI job (which runs install + test only, no `kubb:generate` and no
// Prisma client). Existing page tests mock these same modules. Catch-all proxies
// return a no-op for any named export, which is enough to let the modules load.
jest.mock("@jitaspace/hooks", () => new Proxy({}, { get: () => () => null }));
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock(
  "@jitaspace/esi-client",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "@jitaspace/sde-client",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "@jitaspace/tiptap-eve",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock(
  "mantine-react-table",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("mantine-datatable", () => new Proxy({}, { get: () => () => null }));
jest.mock("~/lib/db", () => ({ prisma: {} }));

jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: () => undefined,
  useParams: () => ({}),
  useRouter: () => ({}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ROUTES = [
  { name: "active-wars", Page: require("~/app/active-wars/page").default },
  {
    name: "alliance",
    Page: require("~/app/alliance/[allianceId]/page").default,
  },
  {
    name: "bloodline",
    Page: require("~/app/bloodline/[bloodlineId]/page").default,
  },
  { name: "calendar", Page: require("~/app/calendar/[eventId]/page").default },
  {
    name: "category",
    Page: require("~/app/category/[categoryId]/page").default,
  },
  {
    name: "character",
    Page: require("~/app/character/[characterId]/page").default,
  },
  {
    name: "constellation",
    Page: require("~/app/constellation/[constellationId]/page").default,
  },
  {
    name: "contract",
    Page: require("~/app/contract/[contractId]/page").default,
  },
  {
    name: "corporation",
    Page: require("~/app/corporation/[corporationId]/page").default,
  },
  {
    name: "dogma/attribute",
    Page: require("~/app/dogma/attribute/[attributeId]/page").default,
  },
  {
    name: "dogma/effect",
    Page: require("~/app/dogma/effect/[effectId]/page").default,
  },
  { name: "faction", Page: require("~/app/faction/[factionId]/page").default },
  { name: "group", Page: require("~/app/group/[groupId]/page").default },
  { name: "kill", Page: require("~/app/kill/[killId]/page").default },
  {
    name: "lp-store",
    Page: require("~/app/lp-store/[corporationId]/page").default,
  },
  { name: "mail", Page: require("~/app/mail/page").default },
  // /market is now a static landing; the Suspense fallback lives on the item route.
  {
    name: "market/[typeId]",
    Page: require("~/app/market/[typeId]/page").default,
  },
  { name: "planet", Page: require("~/app/planet/[planetId]/page").default },
  { name: "race", Page: require("~/app/race/[raceId]/page").default },
  { name: "region", Page: require("~/app/region/[regionId]/page").default },
  { name: "star", Page: require("~/app/star/[starId]/page").default },
  { name: "station", Page: require("~/app/station/[stationId]/page").default },
  { name: "status", Page: require("~/app/status/page").default },
  {
    name: "structure",
    Page: require("~/app/structure/[structureId]/page").default,
  },
  { name: "system", Page: require("~/app/system/[systemId]/page").default },
  {
    name: "travel",
    Page: require("~/app/travel/[[...waypoints]]/page").default,
  },
  { name: "type", Page: require("~/app/type/[typeId]/page").default },
  { name: "war", Page: require("~/app/war/[warId]/page").default },
];

describe("route loading fallback", () => {
  it.each(ROUTES)(
    "$name route wraps its content in a PageSkeleton fallback",
    ({ Page }) => {
      const element = Page({ params: Promise.resolve({}) });
      expect(element.type).toBe(Suspense);
      expect(element.props.fallback?.type).toBe(PageSkeleton);
    },
  );
});
