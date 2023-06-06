import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { MailingListsTable } from "~/components/EveMail";

export function ViewMailingListSubscriptionsModal({}: ContextModalProps<{
  /* empty */
}>) {
  return <MailingListsTable />;
}
