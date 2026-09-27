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
 * id arm can be shape-checked: a non-canonical id spelling ("01000180",
 * "1000180.0") is tried as a name, matches nothing and reaches not-found.
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

async function getLPStoreCorporationData(
  segment: string,
): Promise<LPStoreCorporationPageProps> {
  "use cache";
  cacheLife("days");

  const store = await readLpStoreCorporation(segment);
  // Thrown rather than returned so `PageContent` renders not-found exactly as
  // it did when this was a `findFirstOrThrow`.
  if (!store) throw new Error(`No LP store corporation matches "${segment}"`);
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
      },
    },
    where: {
      corporationId: corporation.corporationId,
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
  try {
    const corporation = await readLpStoreCorporation(segment);
    if (!corporation) return {};
    const id = corporation.corporationId;

    const offerCount = await prisma.loyaltyStoreOffer.count({
      where: { corporationId: id },
    });

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
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ corporationId: string }>;
}>) {
  const { corporationId } = await params;

  let props: LPStoreCorporationPageProps;
  try {
    props = await getLPStoreCorporationData(corporationId);
  } catch {
    notFound();
  }
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
