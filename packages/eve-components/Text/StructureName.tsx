"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type StructureNameProps = TextProps & {
  structureId?: string | number;
};

export const StructureName = memo(
  ({ structureId, ...otherProps }: StructureNameProps) => {
    return (
      <EveEntityName
        entityId={structureId}
        category="structure"
        {...otherProps}
      />
    );
  },
);
StructureName.displayName = "StructureName";
