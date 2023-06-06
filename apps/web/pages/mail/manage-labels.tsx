import React, { type ReactElement } from "react";
import { Button, Container, Group } from "@mantine/core";
import { openContextModal } from "@mantine/modals";

import { LabelManagementTable } from "~/components/EveMail";
import { MailLayout } from "~/layout";

export default function Page() {
  return (
    <Container>
      <Group position="apart">
        <h1>Manage Labels</h1>
        <Button
          onClick={() =>
            openContextModal({
              modal: "createMailLabel",
              title: "Create Mail Label",
              size: "md",
              innerProps: {},
            })
          }
        >
          Create Label
        </Button>
      </Group>

      <LabelManagementTable />
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
