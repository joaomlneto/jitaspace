import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { ContactsIcon } from "@jitaspace/eve-icons";

import { CorporationContactsTable } from "~/components/Contacts/ContactsTable/CorporationContactsTable";
import { MainLayout } from "~/layouts";


export default function Page() {
  return (
    <Container size="sm">
      <Stack>
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Contacts</Title>
        </Group>
        <CorporationContactsTable />
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
