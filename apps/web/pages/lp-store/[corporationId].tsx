import React, { type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Breadcrumbs,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { LPStoreIcon } from "@jitaspace/eve-icons";
import { CorporationAvatar } from "@jitaspace/ui";

import { LoyaltyPointsTable } from "~/components/LPStore";
import { env } from "~/env.mjs";
import { MainLayout } from "~/layouts";


type PageProps = {
  corporation: { corporationId: number; name: string };
  types: { typeId: number; name: string }[];
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

export const getStaticPaths: GetStaticPaths = async () => {
  // When this is true (in preview environments) don't prerender any static pages
  // (faster builds, but slower initial page load)
  if (env.SKIP_BUILD_STATIC_GENERATION === "true") {
    return {
      paths: [],
      fallback: true,
    };
  }

  // Get list of categoryIDs from ESI
  const corporationIds = (
    await prisma.loyaltyStoreOffer.groupBy({
      by: ["corporationId"],
    })
  ).map((corporation) => corporation.corporationId);

  const corporations = await prisma.corporation.findMany({
    select: {
      corporationId: true,
      name: true,
    },
    where: {
      corporationId: {
        in: corporationIds,
      },
    },
  });

  // Allow filtering by either providing the corporation ID (1000120),
  // URL-encoded corporation name ("Federation%20Navy") or
  // name with spaces as underscores ("Federation_Navy")
  const paths = corporations.flatMap((corporation) => [
    // dont generate URL-encoded versions at compile time!
    /*{
      params: {
        corporationId: `${corporation.name}`,
      },
    },*/
    {
      params: {
        corporationId: `${corporation.name.replaceAll(" ", "_")}`,
      },
    },
    // dont generate Corporation ID pages at compile time!
    /*
    {
      params: {
        corporationId: `${corporation.corporationId}`,
      },
    },*/
  ]);

  return {
    paths,
    fallback: true, // if not statically generated, try to confirm if there is a new category
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const requestedCorporation = context.params?.corporationId as string;
    const numericRequestedCorporation = Number(requestedCorporation);
    const requestedCorporationId = !isNaN(numericRequestedCorporation)
      ? numericRequestedCorporation
      : undefined;

    // get requested corporation details
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
      props: {
        corporation,
        types,
        offers: offers.map((offer) => ({
          ...offer,
          iskCost: Number(offer.iskCost),
          lpCost: Number(offer.lpCost),
        })),
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // 1 hour on error
    };
  }
};

export default function Page({ corporation, types, offers }: PageProps) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading Loyalty Point Store Offers...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack>
        <Breadcrumbs>
          <Group>
            <LPStoreIcon width={48} />
            <Anchor component={Link} href="/lp-store">
              <Title>LP Store</Title>
            </Anchor>
          </Group>
          <Group>
            <CorporationAvatar corporationId={corporation.corporationId} />
            <Title>{corporation.name}</Title>
          </Group>
        </Breadcrumbs>
        <LoyaltyPointsTable
          corporations={[corporation]}
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
