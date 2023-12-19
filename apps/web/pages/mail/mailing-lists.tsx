import React, { type ReactElement } from "react";
import { Container, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { useSelectedCharacter } from "@jitaspace/hooks";

import { MailingListsTable } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


export default function Page() {
  const character = useSelectedCharacter();
  return (
    <Container>
      <Stack>
        <Title order={1}>Mailing List Subscriptions</Title>
        {character && <MailingListsTable characterId={character.characterId} />}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Mailing Lists | EveMail" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = [
  "esi-mail.organize_mail.v1",
  "esi-mail.read_mail.v1",
  "esi-mail.send_mail.v1",
  "esi-search.search_structures.v1",
  "esi-characters.read_contacts.v1",
];
