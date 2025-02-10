import React, { type ReactElement } from "react";
import { Container, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { EveMailComposeForm } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


export default function Page() {
  return (
    <Container>
      <Title order={1}>Compose New Message</Title>
      <EveMailComposeForm />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Compose New Message | EveMail" />
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
