import React, { type ReactElement } from "react";
import { Container, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { EveMailFaqAccordion } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Title order={1}>Frequently Asked Questions</Title>
      <EveMailFaqAccordion />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MailLayout>
      <NextSeo title="FAQ | EveMail" />
      {page}
    </MailLayout>
  );
};

Page.requiredScopes = [
  "esi-mail.organize_mail.v1",
  "esi-mail.read_mail.v1",
  "esi-mail.send_mail.v1",
  "esi-search.search_structures.v1",
  "esi-characters.read_contacts.v1",
];
