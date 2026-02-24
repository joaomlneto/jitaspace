"use client";

import { Container, Group, Stack, Title } from "@mantine/core";

import { ContactsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { CharacterContactsDataTable } from "~/components/Contacts";

export default function Page() {
  const character = useSelectedCharacter();
  return (
    <>
      <Container size="xl">
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Character Contacts</Title>
        </Group>
      </Container>

      <Stack mt="xl">
        <Container fluid>
          <Stack>
            {character && (
              <CharacterContactsDataTable characterId={character.characterId} />
            )}
          </Stack>
        </Container>
      </Stack>
    </>
  );
}
