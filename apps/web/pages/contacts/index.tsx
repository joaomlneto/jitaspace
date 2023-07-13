import React, { type ReactElement } from "react";
import { Container, Group, Stack, Tabs, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { ContactsIcon } from "@jitaspace/eve-icons";

import { AllianceContactsTable } from "~/components/Contacts/ContactsTable/AllianceContactsTable";
import { CharacterContactsTable } from "~/components/Contacts/ContactsTable/CharacterContactsTable";
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
        <Tabs keepMounted={false} defaultValue="character">
          <Tabs.List>
            <Tabs.Tab value="character">Character</Tabs.Tab>
            <Tabs.Tab value="corporation">Corporation</Tabs.Tab>
            <Tabs.Tab value="alliance">Alliance</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="character">
            <CharacterContactsTable />
          </Tabs.Panel>

          <Tabs.Panel value="corporation">
            <CorporationContactsTable />
          </Tabs.Panel>

          <Tabs.Panel value="alliance">
            <AllianceContactsTable />
          </Tabs.Panel>
        </Tabs>
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
