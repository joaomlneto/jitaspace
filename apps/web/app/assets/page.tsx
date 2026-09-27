"use client";

import { Container, Group, SimpleGrid, Title } from "@mantine/core";

import { AssetsIcon, CorporationAssetsIcon } from "@jitaspace/eve-icons";

import { SectionLinkCard } from "~/components/Card/SectionLinkCard";

export default function Page() {
  return (
    <Container size="lg">
      <Group>
        <AssetsIcon width={48} />
        <Title order={1}>Assets</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 2 }}>
        <SectionLinkCard
          href="/assets/character"
          Icon={AssetsIcon}
          title="Character Assets"
          description="View your character assets."
        />
        <SectionLinkCard
          href="/assets/corporation"
          Icon={CorporationAssetsIcon}
          title="Corporation Assets"
          description="View your corporation assets."
        />
      </SimpleGrid>
    </Container>
  );
}
