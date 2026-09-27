"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useStructure } from "@jitaspace/hooks";
import { EveEntityNameDisplay } from "@jitaspace/ui";

export type StructureNameProps = TextProps & {
  structureId?: string | number;
};

/**
 * Structure names are not public. `/universe/structures/{id}` needs the
 * `esi-universe.read_structures.v1` scope and a character on the structure's
 * access list, so they cannot come from the shared name cache behind
 * EveEntityName, which resolves without a token — through it every structure
 * rendered "Unknown". useStructure signs the request with a logged-in character
 * that holds the scope.
 */
export const StructureName = memo(
  ({ structureId, ...otherProps }: StructureNameProps) => {
    const { data, isLoading } = useStructure(
      structureId ? Number(structureId) : 0,
    );

    return (
      <EveEntityNameDisplay
        name={data?.data.name}
        loading={isLoading || !structureId}
        {...otherProps}
      />
    );
  },
);
StructureName.displayName = "StructureName";
