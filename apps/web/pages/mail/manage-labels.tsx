import React, { type ReactElement } from "react";
import { Container, Group } from "@mantine/core";

import { LabelManagementTable } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Group position="apart">
        <h1>Manage Labels</h1>
      </Group>

      <LabelManagementTable />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
