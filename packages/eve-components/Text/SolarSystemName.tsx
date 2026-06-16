"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

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
