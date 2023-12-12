import React, { useMemo, type ReactElement } from "react";
import { Container, Group, JsonInput, Text, Title } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useMultipleSessions } from "@jitaspace/hooks";
import { CharacterAvatar, TimeAgoText } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";


export default function Page() {
  const { data: session, status, update } = useSession();
  const x = useMultipleSessions();
  const characters = useMemo(
    () =>
      Object.values(x.characters ?? {}).map((char) => ({
        ...char,
        expirationDate: new Date(char.accessTokenExpirationDate),
      })),
    [x.characters],
  );
  return (
    <Container size="lg">
      <Title order={3}>Test Page</Title>
      <JsonInput value={JSON.stringify(x, null, 2)} autosize maxRows={40} />
      {false && (
        <JsonInput
          value={JSON.stringify(session, null, 2)}
          autosize
          maxRows={40}
        />
      )}
      {characters.map((char) => (
        <Container key={char.characterId}>
          <Group position="apart">
            <Group>
              <CharacterAvatar characterId={char.characterId} />
              <Text>{char.accessTokenPayload.name}</Text>
            </Group>
            <TimeAgoText addSuffix date={char.expirationDate} />
          </Group>
        </Container>
      ))}
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
