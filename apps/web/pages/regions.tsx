import React, { useCallback, useMemo, type ReactElement } from "react";
import { Container, SimpleGrid, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { useGetUniverseRegions } from "@jitaspace/esi-client-kubb";
import { useEsiNamePrefetch, useEsiNamesCache } from "@jitaspace/esi-hooks";
import { RegionAnchor, RegionName } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { data: regionIds } = useGetUniverseRegions();
  const cache = useEsiNamesCache();

  const getNameFromCache = useCallback(
    (id: number) => cache[id]?.value?.name,
    [cache],
  );

  useEsiNamePrefetch(
    (regionIds ?? []).map((regionId) => ({
      id: regionId,
      category: "region",
    })),
  );

  const entries = useMemo(
    () =>
      (regionIds ?? [])
        .map((regionId) => ({
          regionId,
          name: getNameFromCache(regionId),
        }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [regionIds, getNameFromCache],
  );

  const newEdenEntries = useMemo(
    () =>
      entries.filter(
        (region) => region.regionId >= 10000000 && region.regionId < 11000000,
      ),
    [entries],
  );

  const wormholeEntries = useMemo(
    () =>
      entries.filter(
        (region) => region.regionId >= 11000000 && region.regionId < 12000000,
      ),
    [entries],
  );

  const abyssalEntries = useMemo(
    () =>
      entries.filter(
        (region) => region.regionId >= 12000000 && region.regionId < 13000000,
      ),
    [entries],
  );

  const otherEntries = useMemo(
    () =>
      entries.filter(
        (region) => region.regionId < 10000000 || region.regionId >= 14000000,
      ),
    [entries],
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
            <RegionAnchor regionId={entry.regionId} key={entry.regionId}>
              <RegionName regionId={entry.regionId} />
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
            <RegionAnchor regionId={entry.regionId} key={entry.regionId}>
              <RegionName regionId={entry.regionId} />
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
            <RegionAnchor regionId={entry.regionId} key={entry.regionId}>
              <RegionName regionId={entry.regionId} />
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
            <RegionAnchor regionId={entry.regionId} key={entry.regionId}>
              <RegionName regionId={entry.regionId} />
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
