import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { ContactsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import { CorporationContactsDataTable } from "~/components/Contacts";
import { MainLayout } from "~/layouts";


export default function Page() {
  const character = useSelectedCharacter();
  return (
    <>
      <Container size="xl">
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Corporation Contacts</Title>
        </Group>
      </Container>

      <Stack mt="xl">
        <Container fluid>
          <Stack>
            {character && (
              <CorporationContactsDataTable
                corporationId={character.corporationId}
              />
            )}
          </Stack>
        </Container>
      </Stack>
    </>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Contacts" />
      {page}
    </MainLayout>
  );
};
