import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

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
