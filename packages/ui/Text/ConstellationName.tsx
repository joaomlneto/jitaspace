"use client";

import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { EveEntityName } from "./EveEntityName";


export type ConstellationNameProps = TextProps & {
  constellationId?: string | number;
};

export const ConstellationName = memo(
  ({ constellationId, ...otherProps }: ConstellationNameProps) => {
    return (
      <EveEntityName
        entityId={constellationId}
        category="constellation"
        {...otherProps}
      />
    );
  },
);
ConstellationName.displayName = "ConstellationName";
