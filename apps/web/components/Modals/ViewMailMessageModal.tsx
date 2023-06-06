import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { MessagePanel } from "~/components/MessagePanel";

export function ViewMailMessageModal({
  innerProps,
}: ContextModalProps<{ messageId: number }>) {
  return <MessagePanel messageId={innerProps.messageId} />;
}
