"use client";

import type { ContextModalProps } from "@mantine/modals";

import type { AuthenticatedCharacterTokenDetailsPanelProps } from "~/components/Auth";
import { AuthenticatedCharacterTokenDetailsPanel } from "~/components/Auth";

export function SsoTokenModal({
  innerProps,
}: ContextModalProps<AuthenticatedCharacterTokenDetailsPanelProps>) {
  return <AuthenticatedCharacterTokenDetailsPanel {...innerProps} />;
}
