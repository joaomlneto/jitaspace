"use client";

import { Container, Group, SimpleGrid, Title } from "@mantine/core";

import { AttributesIcon, OtherIcon } from "@jitaspace/eve-icons";

import { SectionLinkCard } from "~/components/Card/SectionLinkCard";

export default function PageClient() {
  return (
    <Container size="lg">
      <Group>
        <AttributesIcon width={48} />
        <Title order={1}>Dogma System</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 2 }}>
        <SectionLinkCard
          href="/dogma/attributes"
          Icon={AttributesIcon}
          title="Dogma Attributes"
          description="View the characteristics of all the items in the game."
        />
        <SectionLinkCard
          href="/dogma/effects"
          Icon={OtherIcon}
          title="Dogma Effects"
          description="View how characteristics of things affect other things."
        />
      </SimpleGrid>
    </Container>
  );
}
