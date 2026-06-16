"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type AllianceNameProps = TextProps & {
  allianceId?: string | number;
};

export const AllianceName = memo(
  ({ allianceId, ...otherProps }: AllianceNameProps) => {
    return (
      <EveEntityName
        entityId={allianceId}
        category="alliance"
        {...otherProps}
      />
    );
  },
);
AllianceName.displayName = "AllianceName";
