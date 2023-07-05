import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { EveEntityName } from "./EveEntityName";

export type StationNameProps = TextProps & {
  stationId?: string | number;
};

export const StationName = memo(
  ({ stationId, ...otherProps }: StationNameProps) => {
    return (
      <EveEntityName entityId={stationId} category="station" {...otherProps} />
    );
  },
);
StationName.displayName = "StationName";
