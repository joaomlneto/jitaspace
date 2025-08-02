"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { EsiKillmailFittingCard } from "~/components/Fitting";

export function KillmailFittingModal({
  innerProps,
}: ContextModalProps<{
  killmailId: number;
  killmailHash: string;
}>) {
  return (
    <EsiKillmailFittingCard
      killmailId={innerProps.killmailId}
      killmailHash={innerProps.killmailHash}
    />
  );
}
