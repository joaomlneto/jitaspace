"use client";

import type { ContextModalProps } from "@mantine/modals";

import { MailingListsTable } from "~/components/EveMail";

export function ViewMailingListSubscriptionsModal({
  innerProps,
}: Readonly<
  ContextModalProps<{
    characterId: number;
  }>
>) {
  return <MailingListsTable characterId={innerProps.characterId} />;
}
