import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { LPStoreCorporationPageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { eveImage, pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import LPStoreCorporationPage from "./page.client";

async function getLPStoreCorporationData(
  corporationId: string,
): Promise<LPStoreCorporationPageProps> {
  "use cache";
  cacheLife("days");

  // The segment is dual-purpose: `/lp-store` links each store by underscored
  // corporation name, while the sitemap advertises the numeric id (183 URLs).
  // So only the numeric arm can be shape-checked — a non-canonical spelling
  // ("01000035", "1000035.0") falls through to the name lookup, matches nothing
  // and 404s. That is why this route validates here rather than in
  // `PageContent` like the single-purpose id routes do.
  const requestedCorporationId =
    parsePositiveEntityId(corporationId) ?? undefined;

  const corporation = await prisma.corporation.findFirstOrThrow({
    select: {
      corporationId: true,
      name: true,
    },
    where: {
      OR: [
        {
          corporationId: requestedCorporationId,
        },
        {
          name: {
            equals: corporationId.replaceAll("_", " "),
          },
        },
      ],
    },
  });

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
  const { corporationId } = await params;
  const id = parsePositiveEntityId(corporationId);
  if (id === null) return {};
  try {
    const corporation = await prisma.corporation.findUnique({
      select: { name: true, ticker: true },
      where: { corporationId: id },
    });
    if (!corporation) return {};

    const offerCount = await prisma.loyaltyStoreOffer.count({
      where: { corporationId: id },
    });

    return pageMetadata({
      title: `${corporation.name} LP Store`,
      description: `Browse the ${offerCount} Loyalty Point offers from ${corporation.name} in EVE Online — LP and ISK cost, required items, and item values.`,
      path: `/lp-store/${id}`,
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
