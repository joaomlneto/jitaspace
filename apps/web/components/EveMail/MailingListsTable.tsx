import React from "react";
import { Alert, Container, Group, Stack, Text } from "@mantine/core";

import { GroupListIcon } from "@jitaspace/eve-icons";
import { useCharacterMailingLists } from "@jitaspace/hooks";





export function MailingListsTable() {
  const { data, error } = useCharacterMailingLists();

  return (
    <>
      {error && (
        <Container size="xs">
          <Alert title="Error loading messages">Error loading messages</Alert>
        </Container>
      )}
      {data && (
        <Stack>
          {data.data.map((list) => (
            <Group key={list.mailing_list_id} noWrap spacing="xs">
              <GroupListIcon width={24} height={24} alt="Mailing List" />
              <Text>{list.name}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </>
  );
}
