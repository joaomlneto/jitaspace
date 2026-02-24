"use client";

import { Container, Group, Stack, Title } from "@mantine/core";

import { ContactsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { AllianceContactsDataTable } from "~/components/Contacts";

export default function Page() {
  const character = useSelectedCharacter();
  return (
    <>
      <Container size="xl">
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Alliance Contacts</Title>
        </Group>
      </Container>

      <Stack mt="xl">
        <Container fluid>
          <Stack>
            {character?.allianceId && (
              <AllianceContactsDataTable allianceId={character.allianceId} />
            )}
          </Stack>
        </Container>
      </Stack>
    </>
  );
}
