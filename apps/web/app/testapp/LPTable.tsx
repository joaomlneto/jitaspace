import React from "react";

import { prisma } from "@jitaspace/db";

import { LoyaltyPointsTable } from "~/components/LPStore";


const fetchCorporationData = async (corporationId: number) => {
  // get requested corporation details
  const corporation = await prisma.corporation.findFirstOrThrow({
    select: {
      corporationId: true,
      name: true,
    },
    where: {
      corporationId: corporationId,
    },
  });

  // get offers
  const offers = await prisma.loyaltyStoreOffer.findMany({
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

  // get typeIds from these offers
  const typeIds = offers.flatMap((offer) => [
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

  return {
    corporation,
    types,
    offers: offers.map((offer) => ({
      ...offer,
      iskCost: Number(offer.iskCost),
      lpCost: Number(offer.lpCost),
    })),
  };
};

export const LPTable = async () => {
  const data = await fetchCorporationData(1000125);

  return (
    <>
      {false && (
        <table>
          <thead>
            <tr>
              <th>item</th>
              <th>LP</th>
              <th>ISK</th>
            </tr>
          </thead>
          <tbody>
            {data.offers.map((offer) => (
              <tr key={`${offer.corporationId}_${offer.offerId}`}>
                <td>{offer.typeId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LoyaltyPointsTable corporations={[]} offers={[]} types={[]} />
    </>
  );
};
