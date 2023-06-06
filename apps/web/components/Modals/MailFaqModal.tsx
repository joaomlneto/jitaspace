import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { EveMailFaqAccordion } from "~/components/EveMail";

export function MailFaqModal({}: ContextModalProps<{
  // no extra props
}>) {
  return <EveMailFaqAccordion />;
}
