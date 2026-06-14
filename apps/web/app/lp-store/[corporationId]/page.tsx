import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";

import LPStoreCorporationPage from "./page.client";
import type { LPStoreCorporationPageProps } from "./page.client";

async function getLPStoreCorporationData(
  corporationId: string,
): Promise<LPStoreCorporationPageProps> {
  "use cache";
  cacheLife("days");

  const numericRequestedCorporation = Number(corporationId);
  const requestedCorporationId = !Number.isNaN(numericRequestedCorporation)
    ? numericRequestedCorporation
    : undefined;

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
  const id = Number(corporationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const corporation = await prisma.corporation.findUnique({
      select: { name: true },
      where: { corporationId: id },
    });
    const name = corporation?.name;
    return {
      title: name ? `${name} LP Store` : "LP Store",
      description: name
        ? `Browse Loyalty Point store offers from ${name} in EVE Online.`
        : undefined,
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}) {
  const { corporationId } = await params;

  try {
    const props = await getLPStoreCorporationData(corporationId);
    return <LPStoreCorporationPage {...props} />;
  } catch {
    notFound();
  }
}

export default function Page({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
