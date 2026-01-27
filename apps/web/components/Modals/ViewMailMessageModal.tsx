"use client";

import type { ContextModalProps } from "@mantine/modals";

import type { MessagePanelProps } from "~/components/EveMail";
import { MessagePanel } from "~/components/EveMail";

export function ViewMailMessageModal({
  innerProps,
}: ContextModalProps<MessagePanelProps>) {
  return <MessagePanel {...innerProps} />;
}
