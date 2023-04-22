import React, { type ReactElement } from "react";
import Image from "next/image";
import {
  Alert,
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

import { DefaultLayout } from "~/layout";

export default function Page() {
  const { data: session } = useSession();

  const { data, error, isLoading, isValidating } =
    useGetCharactersCharacterIdMailLists(session?.user.id ?? 1, undefined, {
      swr: {
        enabled: !!session?.user.id,
      },
    });

  return (
    <Container>
      <Stack>
        {error && (
          <Container size="xs">
            <Alert title="Error loading messages">{error.message}</Alert>
          </Container>
        )}
        <Group>
          <Title order={1}>Mailing List Subscriptions</Title>
          {(isLoading || isValidating) && (
            <Group>
              <Loader size="xs" />
              {isLoading && <Text>Loading</Text>}
              {isValidating && <Text>Refreshing</Text>}
            </Group>
          )}
        </Group>
        {data && (
          <Table highlightOnHover striped verticalSpacing="xs">
            <tbody>
              {data.data.map((list) => (
                <tr key={list.mailing_list_id}>
                  <td>
                    <Group noWrap>
                      <Image
                        src="/icons/grouplist.png"
                        width={26}
                        height={26}
                        alt="Mailing List"
                      />
                      <Text>{list.name}</Text>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <DefaultLayout>{page}</DefaultLayout>;
};
