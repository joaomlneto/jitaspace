import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import LPStoreCorporationPage from "./page.client";
import type { LPStoreCorporationPageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}) {
  try {
    const { corporationId: requestedCorporation } = await params;
    const numericRequestedCorporation = Number(requestedCorporation);
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
              equals: requestedCorporation.replaceAll("_", " "),
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
    const props: LPStoreCorporationPageProps = {
      corporation,
      offers,
      types,
    };
    return <LPStoreCorporationPage {...props} />;
  } catch {
    notFound();
  }
}
