import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { MapIcon } from "@jitaspace/eve-icons";
import { RegionAnchor } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";


type PageProps = {
  regions: { regionId: number; name: string }[];
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const regions = await prisma.region.findMany({
      select: {
        regionId: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      props: {
        regions,
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

export default function Page({ regions }: PageProps) {
  const galaxies: {
    name: string;
    filter: (region: { regionId: number; name: string }) => boolean;
  }[] = [
    {
      name: "New Eden (K-Space)",
      filter: (region) =>
        region.regionId >= 10000000 && region.regionId < 11000000,
    },
    {
      name: "Anoikis (W-Space)",
      filter: (region) =>
        region.regionId >= 11000000 && region.regionId < 12000000,
    },
    {
      name: "Abyssal",
      filter: (region) =>
        region.regionId >= 12000000 && region.regionId < 13000000,
    },
    {
      name: "Other",
      filter: (region) =>
        region.regionId < 10000000 || region.regionId >= 14000000,
    },
  ];

  const galaxyRegions = useMemo(() => {
    return galaxies.map((galaxy) => ({
      ...galaxy,
      regions: regions.filter(galaxy.filter),
    }));
  }, [galaxies, regions]);

  return (
    <Container size="sm">
      <Stack>
        <Group>
          <MapIcon width={48} />
          <Title>Regions</Title>
        </Group>
        {galaxyRegions.map((galaxy) => (
          <React.Fragment key={galaxy.name}>
            <Title order={3}>{galaxy.name}</Title>
            <SimpleGrid
              cols={4}
              breakpoints={[
                { maxWidth: "sm", cols: 3, spacing: "md" },
                { maxWidth: "xs", cols: 2, spacing: "sm" },
                { maxWidth: "25em", cols: 1, spacing: "sm" },
              ]}
            >
              {galaxy.regions.map((entry) => (
                <RegionAnchor regionId={entry.regionId} key={entry.regionId}>
                  {entry.name}
                </RegionAnchor>
              ))}
            </SimpleGrid>
          </React.Fragment>
        ))}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Regions" />
      {page}
    </MainLayout>
  );
};
