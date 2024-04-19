"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import {
  AuthenticatedCharacterTokenDetailsPanel,
  AuthenticatedCharacterTokenDetailsPanelProps,
} from "~/components/Auth";

export function SsoTokenModal({
  innerProps,
}: ContextModalProps<AuthenticatedCharacterTokenDetailsPanelProps>) {
  return <AuthenticatedCharacterTokenDetailsPanel {...innerProps} />;
}
