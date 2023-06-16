import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

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
