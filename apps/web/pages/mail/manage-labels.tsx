import React, { type ReactElement } from "react";
import { Container, Group } from "@mantine/core";
import { NextSeo } from "next-seo";

import { LabelManagementTable } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Group justify="apart">
        <h1>Manage Labels</h1>
      </Group>

      <LabelManagementTable />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Manage Labels | EveMail" />
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
