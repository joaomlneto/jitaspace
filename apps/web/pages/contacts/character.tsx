import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { ContactsIcon } from "@jitaspace/eve-icons";

import { CharacterContactsTable } from "~/components/Contacts/ContactsTable/CharacterContactsTable";
import { MainLayout } from "~/layouts";


export default function Page() {
  return (
    <Container size="sm">
      <Stack>
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Contacts</Title>
        </Group>
        <CharacterContactsTable />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Contacts" />
      {page}
    </MainLayout>
  );
};
