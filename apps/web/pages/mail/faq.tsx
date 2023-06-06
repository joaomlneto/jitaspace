import React, { type ReactElement } from "react";
import { Container, Title } from "@mantine/core";

import { EveMailFaqAccordion } from "~/components/EveMail";
import { MailLayout } from "~/layout";

export default function Page() {
  return (
    <Container p="xl">
      <Title order={1}>Frequently Asked Questions</Title>
      <EveMailFaqAccordion />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
