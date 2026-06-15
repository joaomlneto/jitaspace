"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type FactionNameProps = TextProps & {
  factionId?: string | number | null;
};

export const FactionName = memo(
  ({ factionId, ...otherProps }: FactionNameProps) => {
    return (
      <EveEntityName entityId={factionId} category="faction" {...otherProps} />
    );
  },
);
FactionName.displayName = "FactionName";
