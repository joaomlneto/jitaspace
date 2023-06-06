import React from "react";
import { Button, Stack } from "@mantine/core";
import { openContextModal, type ContextModalProps } from "@mantine/modals";

import { LabelManagementTable } from "~/components/EveMail";

export function ManageMailLabelsModal({}: ContextModalProps<{
  /* empty */
}>) {
  return (
    <Stack>
      <Button
        onClick={() => {
          openContextModal({
            title: "Create Label",
            modal: "createMailLabel",
            innerProps: {},
          });
        }}
      >
        Create Label
      </Button>
      <LabelManagementTable />
    </Stack>
  );
}
