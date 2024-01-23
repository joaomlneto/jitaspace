"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { EveMailComposeForm } from "~/components/EveMail/EveMailComposeForm";


export function ComposeMailModal({ context, id }: ContextModalProps) {
  return (
    <EveMailComposeForm
      onSend={() => {
        context.closeModal(id);
      }}
    />
  );
}
