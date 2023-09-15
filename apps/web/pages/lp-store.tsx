import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, JsonInput, Stack, Title } from "@mantine/core";
import axios from "axios";
import { NextSeo } from "next-seo";

import {
  getCorporationsNpccorps,
  getLoyaltyStoresCorporationIdOffers,
  GetLoyaltyStoresCorporationIdOffers200Item,
} from "@jitaspace/esi-client";
import { LPStoreIcon } from "@jitaspace/eve-icons";

import { LoyaltyPointsTable } from "~/components/LPStore";
import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  offers: Record<number, GetLoyaltyStoresCorporationIdOffers200Item[]>;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    const { data: corporationIds } = await getCorporationsNpccorps();

    const npcCorporationOffersResponse = await Promise.all(
      corporationIds.map(async (corporationId) => {
        // FIXME: remove the await...
        return {
          corporationId,
          offers: (await getLoyaltyStoresCorporationIdOffers(corporationId))
            .data,
        };
      }),
    );

    const offers: Record<number, GetLoyaltyStoresCorporationIdOffers200Item[]> =
      {};
    npcCorporationOffersResponse.forEach((corporationOffers) => {
      if (corporationOffers.offers.length > 0) {
        offers[corporationOffers.corporationId] = corporationOffers.offers;
      }
    });

    return {
      props: {
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

export default function Page({ offers }: PageProps) {
  const listOfOffers: (GetLoyaltyStoresCorporationIdOffers200Item & {
    corporationId: number;
  })[] = useMemo(
    () =>
      Object.entries(offers).flatMap(([corporationId, corporationOffers]) =>
        corporationOffers.map((corporationOffer) => ({
          corporationId: Number(corporationId),
          ...corporationOffer,
        })),
      ),
    [offers],
  );

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        {false && (
          <JsonInput
            value={JSON.stringify(
              {
                numCorporations: Object.keys(offers).length,
                listOfOffers,
              },
              null,
              2,
            )}
            autosize
            maxRows={50}
          />
        )}
        <LoyaltyPointsTable offers={listOfOffers} />
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
