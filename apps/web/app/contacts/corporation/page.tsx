"use client";

import { Container, Group, Stack, Title } from "@mantine/core";

import { ContactsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { CorporationContactsDataTable } from "~/components/Contacts";

export default function Page() {
  const character = useSelectedCharacter();
  return (
    <>
      <Container size="xl">
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Corporation Contacts</Title>
        </Group>
      </Container>

      <Stack mt="xl">
        <Container fluid>
          <Stack>
            {character && (
              <CorporationContactsDataTable
                corporationId={character.corporationId}
              />
            )}
          </Stack>
        </Container>
      </Stack>
    </>
  );
}
