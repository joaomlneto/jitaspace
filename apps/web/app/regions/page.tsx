import React from "react";
import { notFound } from "next/navigation";
import { Container, Group, SimpleGrid, Stack, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { MapIcon } from "@jitaspace/eve-icons";
import { RegionAnchor } from "@jitaspace/ui";


interface PageProps {
  regions: { regionId: number; name: string }[];
}

export const revalidate = 86400;

export default async function Page() {
  let regions: PageProps["regions"] = [];
  try {
    regions = await prisma.region.findMany({
      select: {
        regionId: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  } catch {
    notFound();
  }
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

  const galaxyRegions = galaxies.map((galaxy) => ({
    ...galaxy,
    regions: regions.filter(galaxy.filter),
  }));

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
              cols={{ base: 1, ["25em"]: 2, xs: 3, sm: 4 }}
              spacing={{ base: "sm", sm: "md" }}
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
