import React, { type ReactElement } from "react";
import { Container, Title } from "@mantine/core";

import { EveMailComposeForm } from "~/components/EveMail/EveMailComposeForm";
import { MailLayout } from "~/layout";

export default function Page() {
  return (
    <Container>
      <Title order={1}>Compose New Message</Title>
      <EveMailComposeForm />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
