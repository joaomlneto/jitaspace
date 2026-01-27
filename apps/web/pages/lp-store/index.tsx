import type { ReactElement } from "react";
import _React, { useMemo } from "react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { LPStoreIcon } from "@jitaspace/eve-icons";
import { CorporationAvatar } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

interface PageProps {
  corporations: { corporationId: number; name: string }[];
}

export const getStaticProps: GetStaticProps<PageProps> = async (_context) => {
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

    return {
      props: {
        corporations,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch {
    return {
      notFound: true,
      revalidate: 3600, // at most once per hour
    };
  }
};

export default function Page({ corporations }: PageProps) {
  const sortedCorporations = useMemo(
    () => corporations.sort((a, b) => a.name.localeCompare(b.name)),
    [corporations],
  );
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <LPStoreIcon width={48} />
          <Title>LP Store</Title>
        </Group>
        <Title order={3}>
          Select a corporation below or{" "}
          <Anchor inherit component={Link} href="/lp-store/all">
            show all offers
          </Anchor>
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
          {sortedCorporations.map((corporation) => (
            <Anchor
              component={Link}
              href={`/lp-store/${corporation.name.replaceAll(" ", "_")}`}
              key={corporation.corporationId}
            >
              <Group>
                <CorporationAvatar
                  corporationId={corporation.corporationId}
                  size="sm"
                />
                <Text>{corporation.name}</Text>
              </Group>
            </Anchor>
          ))}
        </SimpleGrid>
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
