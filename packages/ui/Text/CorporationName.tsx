import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

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
