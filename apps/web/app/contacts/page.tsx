"use client";

import { Container, Group, SimpleGrid, Title } from "@mantine/core";

import { ContactsIcon } from "@jitaspace/eve-icons";

import { SectionLinkCard } from "~/components/Card/SectionLinkCard";

export default function Page() {
  return (
    <Container size="lg">
      <Group>
        <ContactsIcon width={48} />
        <Title order={1}>Contacts</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 3 }}>
        <SectionLinkCard
          href="/contacts/character"
          Icon={ContactsIcon}
          title="Character Contacts"
          description="View your character's contacts."
        />
        <SectionLinkCard
          href="/contacts/corporation"
          Icon={ContactsIcon}
          title="Corporation Contacts"
          description="View your corporation's contacts."
        />
        <SectionLinkCard
          href="/contacts/alliance"
          Icon={ContactsIcon}
          title="Alliance Contacts"
          description="View your alliance's contacts."
        />
      </SimpleGrid>
    </Container>
  );
}
