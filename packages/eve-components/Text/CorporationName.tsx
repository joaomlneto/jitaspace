"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type CorporationNameProps = TextProps & {
  corporationId?: string | number;
};

export const CorporationName = memo(
  ({ corporationId, ...otherProps }: CorporationNameProps) => {
    return (
      <EveEntityName
        entityId={corporationId}
        category="corporation"
        {...otherProps}
      />
    );
  },
);
CorporationName.displayName = "CorporationName";
