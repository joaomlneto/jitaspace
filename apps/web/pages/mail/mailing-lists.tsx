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
