import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import {
  ShipFittingCard,
  type ShipFittingCardProps,
} from "~/components/fitting";

export function FittingModal({
  innerProps,
}: ContextModalProps<ShipFittingCardProps>) {
  return <ShipFittingCard {...innerProps} />;
}
