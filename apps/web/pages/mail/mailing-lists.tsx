import React, { type ReactElement } from "react";
import { Container, Stack, Title } from "@mantine/core";

import { MailingListsTable } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Stack>
        <Title order={1}>Mailing List Subscriptions</Title>
        <MailingListsTable />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};

Page.requiredScopes = [
  "esi-mail.organize_mail.v1",
  "esi-mail.read_mail.v1",
  "esi-mail.send_mail.v1",
  "esi-search.search_structures.v1",
  "esi-characters.read_contacts.v1",
];
