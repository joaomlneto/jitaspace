"use client";

import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import {
  ShipFittingCard,
  type ShipFittingCardProps,
} from "~/components/Fitting";


export function FittingModal({
  innerProps,
}: ContextModalProps<ShipFittingCardProps>) {
  return <ShipFittingCard {...innerProps} />;
}
