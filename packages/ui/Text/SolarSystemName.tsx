import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { EveEntityName } from "./EveEntityName";

export type SolarSystemNameProps = TextProps & {
  solarSystemId?: string | number;
};

export const SolarSystemName = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemNameProps) => {
    return (
      <EveEntityName
        entityId={solarSystemId}
        category="solar_system"
        {...otherProps}
      />
    );
  },
);
SolarSystemName.displayName = "SolarSystemName";
