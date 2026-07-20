"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type RegionNameProps = TextProps & {
  regionId?: string | number;
};

export const RegionName = memo(
  ({ regionId, ...otherProps }: RegionNameProps) => {
    return (
      <EveEntityName entityId={regionId} category="region" {...otherProps} />
    );
  },
);
RegionName.displayName = "RegionName";
