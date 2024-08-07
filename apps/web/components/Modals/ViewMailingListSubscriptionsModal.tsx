"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { MailingListsTable } from "~/components/EveMail";


export function ViewMailingListSubscriptionsModal({
  innerProps,
}: ContextModalProps<{
  characterId: number;
}>) {
  return <MailingListsTable characterId={innerProps.characterId} />;
}
