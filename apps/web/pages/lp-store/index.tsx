import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { LPStoreIcon } from "@jitaspace/eve-icons";

import { LoyaltyPointsTable } from "~/components/LPStore";
import { MainLayout } from "~/layouts";

type PageProps = {
  corporations: { corporationId: number; name: string }[];
  types: { typeId: number; name: string }[];
  //offers: Record<number, GetLoyaltyStoresCorporationIdOffers200Item[]>;
  offers: {
    offerId: number;
    corporationId: number;
    typeId: number;
    quantity: number;
    akCost: number | null;
    lpCost: number;
    iskCost: number;
    requiredItems: {
      typeId: number;
      quantity: number;
    }[];
  }[];
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // Get all corporation IDs that have a loyalty store
    const corporationIds = (
      await prisma.loyaltyStoreOffer.groupBy({
        by: ["corporationId"],
      })
    ).map(({ corporationId }) => corporationId);

    // get corporations
    const corporations = await prisma.corporation.findMany({
      select: {
        corporationId: true,
        name: true,
      },
      where: {
        corporationId: { in: corporationIds },
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
    });

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

    console.log({
      numOffers: offers.length,
      numCorporations: corporations.length,
      numTypes: types.length,
    });

    return {
      props: {
        corporations,
        types,
        offers,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 30, // 30 seconds on error
    };
  }
};

export default function Page({ corporations, types, offers }: PageProps) {
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        <LoyaltyPointsTable
          corporations={corporations}
          offers={offers}
          types={types}
        />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="LP Store" />
      {page}
    </MainLayout>
  );
};
