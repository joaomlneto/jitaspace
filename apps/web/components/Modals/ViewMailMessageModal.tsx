"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { MessagePanel, type MessagePanelProps } from "~/components/EveMail";


export function ViewMailMessageModal({
  innerProps,
}: ContextModalProps<MessagePanelProps>) {
  return <MessagePanel {...innerProps} />;
}
