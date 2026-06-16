"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { EveEntityName } from "./EveEntityName";

export type TypeNameProps = TextProps & {
  typeId?: string | number;
};

export const TypeName = memo(({ typeId, ...otherProps }: TypeNameProps) => {
  return (
    <EveEntityName
      entityId={typeId}
      category="inventory_type"
      {...otherProps}
    />
  );
});
TypeName.displayName = "TypeName";
