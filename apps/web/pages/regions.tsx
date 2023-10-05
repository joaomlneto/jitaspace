import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, SimpleGrid, Stack, Title } from "@mantine/core";
import axios from "axios";
import { NextSeo } from "next-seo";

import {
  getUniverseRegions,
  getUniverseRegionsRegionId,
  GetUniverseRegionsRegionId200,
} from "@jitaspace/esi-client-kubb";
import { ESI_BASE_URL } from "@jitaspace/esi-hooks";
import { RegionAnchor } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

type PageProps = {
  regions: GetUniverseRegionsRegionId200[];
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // FIXME: THIS SHOULD NOT BE REQUIRED
    axios.defaults.baseURL = ESI_BASE_URL;

    // Get all IDs for groups and tasks
    const { data: regionIds } = await getUniverseRegions();

    // get data of all groups
    const regions = await Promise.all(
      regionIds.map(async (opportunityGroupId) =>
        getUniverseRegionsRegionId(opportunityGroupId).then((res) => res.data),
      ),
    );

    return {
      props: {
        regions: regions.sort((a, b) => a.name.localeCompare(b.name)),
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
    filter: (region: GetUniverseRegionsRegionId200) => boolean;
  }[] = [
    {
      name: "New Eden (K-Space)",
      filter: (region) =>
        region.region_id >= 10000000 && region.region_id < 11000000,
    },
    {
      name: "Anoikis (W-Space)",
      filter: (region) =>
        region.region_id >= 11000000 && region.region_id < 12000000,
    },
    {
      name: "Abyssal",
      filter: (region) =>
        region.region_id >= 12000000 && region.region_id < 13000000,
    },
    {
      name: "Other",
      filter: (region) =>
        region.region_id < 10000000 || region.region_id >= 14000000,
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
        <Title>Regions</Title>
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
                <RegionAnchor regionId={entry.region_id} key={entry.region_id}>
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
