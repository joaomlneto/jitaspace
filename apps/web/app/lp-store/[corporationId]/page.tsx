import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { LPStoreCorporationPageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import {
  corporationNameFromLpStoreSegment,
  lpStorePath,
} from "~/lib/lpStorePath";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import LPStoreCorporationPage from "./page.client";

/**
 * The corporation an `/lp-store/<segment>` names, or null when nothing does.
 *
 * The segment is dual-purpose: a corporation id (`/lp-store/1000180`) or an
 * underscored name (`/lp-store/State_Protectorate`). Both render the same
 * store, and both canonicalise to the name form — see `lpStorePath`. Only the
 * id arm can be shape-checked: a non-canonical id spelling made of digits
 * ("01000180", "0") is refused before this by {@link couldNameStore}, and any
 * other ("1000180.0") is tried as a name, matches nothing and reaches
 * not-found.
 *
 * Shared by the page and `generateMetadata`, so the two can never resolve the
 * same URL differently again — they did: the metadata understood only ids, so
 * every store the index linked by name got the bare site title. Cached like
 * the store it resolves, and it throws on a failed query rather than
 * returning null, so an outage is never stored as a missing store.
 */
async function readLpStoreCorporation(segment: string) {
  "use cache";
  cacheLife("days");

  const corporationId = parsePositiveEntityId(segment);
  return prisma.corporation.findFirst({
    select: { corporationId: true, name: true, ticker: true },
    where:
      corporationId === null
        ? { name: corporationNameFromLpStoreSegment(segment) }
        : { corporationId },
  });
}

/**
 * Whether a segment could name a store at all. One made only of digits is an
 * id, and a non-canonical spelling of one ("0", "01000180") names nothing: no
 * corporation with an LP store has a name of digits. Refused without a query,
 * which is also what lets `generateStaticParams` list "0" with no database.
 */
function couldNameStore(segment: string): boolean {
  return !/^\d+$/.test(segment) || parsePositiveEntityId(segment) !== null;
}

/**
 * The store's corporation, offers and the names of every item they mention,
 * or null when the segment names no corporation. Uncaught: this page is cached
 * whole, so a failed query throws rather than storing a 404.
 */
async function getLPStoreCorporationData(
  segment: string,
): Promise<LPStoreCorporationPageProps | null> {
  "use cache";
  cacheLife("days");

  const store = await readLpStoreCorporation(segment);
  if (!store) return null;
  const corporation = { corporationId: store.corporationId, name: store.name };

  const offersRaw = await prisma.loyaltyStoreOffer.findMany({
    select: {
      offerId: true,
      corporationId: true,
      typeId: true,
      quantity: true,
      akCost: true,
      lpCost: true,
      iskCost: true,
      requiredItems: {
        select: {
          quantity: true,
          typeId: true,
        },
        where: { isDeleted: false },
      },
    },
    // Rows stay when CCP withdraws an offer, marked deleted by the scrape.
    where: {
      corporationId: corporation.corporationId,
      isDeleted: false,
    },
  });

  const typeIds = offersRaw.flatMap((offer) => [
    offer.typeId,
    ...offer.requiredItems.map((item) => item.typeId),
  ]);

  const types = await prisma.type.findMany({
    select: {
      typeId: true,
      name: true,
    },
    where: {
      typeId: {
        in: typeIds,
      },
    },
  });

  const offers = offersRaw.map((offer) => ({
    ...offer,
    iskCost: Number(offer.iskCost),
    lpCost: Number(offer.lpCost),
  }));

  return {
    corporation,
    offers,
    types,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}): Promise<Metadata> {
  const { corporationId: segment } = await params;
  if (!couldNameStore(segment)) return {};
  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata. The offers come
  // from the page's own cache entry (withdrawn ones already left out), so this
  // costs no query of its own.
  const [corporation, store] = await Promise.all([
    readLpStoreCorporation(segment),
    getLPStoreCorporationData(segment),
  ]);
  if (!corporation || !store) return {};
  const id = corporation.corporationId;
  const offerCount = store.offers.length;

  return pageMetadata({
    title: `${corporation.name} LP Store`,
    description: `Browse the ${offerCount} Loyalty Point offers from ${corporation.name} in EVE Online — LP and ISK cost, required items, and item values.`,
    // The name form, whichever form was requested, so `/lp-store/1000180`
    // and `/lp-store/State_Protectorate` declare the same canonical.
    path: lpStorePath(corporation.name),
    badge: "LP Store",
    image: eveImage.corporation(id),
    facts: [
      { label: "Offers", value: String(offerCount) },
      ...(corporation.ticker
        ? [{ label: "Ticker", value: corporation.ticker }]
        : []),
    ],
  });
}

// ISR per store: without `generateStaticParams` an unlisted segment re-renders
// on every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]`
// route"). The real stores live in the database, which `next build` cannot
// reach in CI, and Cache Components rejects an empty list — so this lists one
// segment `couldNameStore` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ corporationId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ corporationId: string }>;
}>) {
  const { corporationId } = await params;
  if (!couldNameStore(corporationId)) notFound();

  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is a store that genuinely does not exist.
  const props = await getLPStoreCorporationData(corporationId);
  if (!props) notFound();
  return <LPStoreCorporationPage {...props} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ corporationId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
