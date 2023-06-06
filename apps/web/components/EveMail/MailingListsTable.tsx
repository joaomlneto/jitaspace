import React from "react";
import Image from "next/image";
import { Alert, Container, Group, Stack, Text } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

export function MailingListsTable() {
  const { data: session } = useSession();

  const { data, error } = useGetCharactersCharacterIdMailLists(
    session?.user.id ?? 1,
    {},
    {
      swr: {
        enabled: !!session?.user.id,
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
            <Group key={list.mailing_list_id} noWrap spacing="xs">
              <Image
                src="/icons/grouplist.png"
                width={24}
                height={24}
                alt="Mailing List"
              />
              <Text>{list.name}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </>
  );
}
