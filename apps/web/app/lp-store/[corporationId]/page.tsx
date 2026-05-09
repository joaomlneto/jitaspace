import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

import LPStoreCorporationPage from "./page.client";
import type { LPStoreCorporationPageProps } from "./page.client";

async function getLPStoreCorporationData(
  corporationId: string,
): Promise<LPStoreCorporationPageProps> {
  "use cache";
  cacheLife("days");

  const numericRequestedCorporation = Number(corporationId);
  const requestedCorporationId = !isNaN(numericRequestedCorporation)
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
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
