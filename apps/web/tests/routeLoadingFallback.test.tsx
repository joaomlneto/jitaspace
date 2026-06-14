import { Suspense } from "react";
import { describe, expect, it, jest } from "@jest/globals";

import { PageSkeleton } from "~/components/PageSkeleton";

/* Loading each route's server component requires a dynamic `require` whose
   result is `any`; the unsafe-* rules below are inherent to that pattern (the
   same one existing page tests use). */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

// Every server page wraps its content in <Suspense fallback={<PageSkeleton />}>,
// so the route reserves layout space while content streams in (replacing the old
// bare <Loader /> spinner that caused layout shift). Invoking a page's default
// export runs that wrapper without awaiting the async content, letting us assert
// — across every route — that the shared loading skeleton is used.

// Some route content components pull in ESM-only table libraries that Jest does
// not transform. We only assert the Suspense fallback (not the content), so stub
// them out to let the page modules load.
jest.mock("mantine-react-table", () => ({
  MantineReactTable: () => null,
  useMantineReactTable: () => ({}),
}));
jest.mock("mantine-datatable", () => ({
  DataTable: () => null,
}));

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
  { name: "market", Page: require("~/app/market/page").default },
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
