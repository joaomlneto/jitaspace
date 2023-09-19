import React from "react";
import { Alert, Container, Group, Stack, Text } from "@mantine/core";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { GroupListIcon } from "@jitaspace/eve-icons";

export function MailingListsTable() {
  const { characterId, isTokenValid } = useEsiClientContext();

  const { data, error } = useGetCharactersCharacterIdMailLists(
    characterId ?? 1,
    {},
    {
      swr: {
        enabled: isTokenValid,
      },
    },
  );

  return (
    <>
      {error && (
        <Container size="xs">
          <Alert title="Error loading messages">{error.message}</Alert>
        </Container>
      )}
      {data && (
        <Stack>
          {data.data.map((list) => (
            <Group key={list.mailing_list_id} wrap="nowrap" spacing="xs">
              <GroupListIcon width={24} height={24} alt="Mailing List" />
              <Text>{list.name}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </>
  );
}
