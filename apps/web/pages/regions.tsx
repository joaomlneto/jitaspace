import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, SimpleGrid, Stack, Title } from "@mantine/core";
import axios from "axios";
import { NextSeo } from "next-seo";

import {
  getUniverseRegions,
  getUniverseRegionsRegionId,
  GetUniverseRegionsRegionId200,
} from "@jitaspace/esi-client";
import { ESI_BASE_URL } from "@jitaspace/esi-hooks";
import { RegionAnchor, RegionName } from "@jitaspace/ui";

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
  const newEdenEntries = useMemo(
    () =>
      regions.filter(
        (region) => region.region_id >= 10000000 && region.region_id < 11000000,
      ),
    [regions],
  );

  const wormholeEntries = useMemo(
    () =>
      regions.filter(
        (region) => region.region_id >= 11000000 && region.region_id < 12000000,
      ),
    [regions],
  );

  const abyssalEntries = useMemo(
    () =>
      regions.filter(
        (region) => region.region_id >= 12000000 && region.region_id < 13000000,
      ),
    [regions],
  );

  const otherEntries = useMemo(
    () =>
      regions.filter(
        (region) => region.region_id < 10000000 || region.region_id >= 14000000,
      ),
    [regions],
  );

  return (
    <Container size="sm">
      <Stack>
        <Title>Regions</Title>
        <Title order={3}>New Eden (K-Space)</Title>
        <SimpleGrid
          cols={4}
          breakpoints={[
            { maxWidth: "sm", cols: 3, spacing: "md" },
            { maxWidth: "xs", cols: 2, spacing: "sm" },
            { maxWidth: "25em", cols: 1, spacing: "sm" },
          ]}
        >
          {newEdenEntries.map((entry) => (
            <RegionAnchor regionId={entry.region_id} key={entry.region_id}>
              <RegionName regionId={entry.region_id} />
            </RegionAnchor>
          ))}
        </SimpleGrid>
        <Title order={3}>Anoikis (W-Space)</Title>
        <SimpleGrid
          cols={4}
          breakpoints={[
            { maxWidth: "sm", cols: 3, spacing: "md" },
            { maxWidth: "xs", cols: 2, spacing: "sm" },
            { maxWidth: "25em", cols: 1, spacing: "sm" },
          ]}
        >
          {wormholeEntries.map((entry) => (
            <RegionAnchor regionId={entry.region_id} key={entry.region_id}>
              <RegionName regionId={entry.region_id} />
            </RegionAnchor>
          ))}
        </SimpleGrid>
        <Title order={3}>Abyssal</Title>
        <SimpleGrid
          cols={4}
          breakpoints={[
            { maxWidth: "sm", cols: 3, spacing: "md" },
            { maxWidth: "xs", cols: 2, spacing: "sm" },
            { maxWidth: "25em", cols: 1, spacing: "sm" },
          ]}
        >
          {abyssalEntries.map((entry) => (
            <RegionAnchor regionId={entry.region_id} key={entry.region_id}>
              <RegionName regionId={entry.region_id} />
            </RegionAnchor>
          ))}
        </SimpleGrid>
        <Title order={3}>Other</Title>
        <SimpleGrid
          cols={4}
          breakpoints={[
            { maxWidth: "sm", cols: 3, spacing: "md" },
            { maxWidth: "xs", cols: 2, spacing: "sm" },
            { maxWidth: "25em", cols: 1, spacing: "sm" },
          ]}
        >
          {otherEntries.map((entry) => (
            <RegionAnchor regionId={entry.region_id} key={entry.region_id}>
              <RegionName regionId={entry.region_id} />
            </RegionAnchor>
          ))}
        </SimpleGrid>
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
