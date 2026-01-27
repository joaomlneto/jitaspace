"use client";

import type { ContextModalProps } from "@mantine/modals";

import type { ShipFittingCardProps } from "~/components/Fitting";
import { ShipFittingCard } from "~/components/Fitting";

export function FittingModal({
  innerProps,
}: ContextModalProps<ShipFittingCardProps>) {
  return <ShipFittingCard {...innerProps} />;
}
