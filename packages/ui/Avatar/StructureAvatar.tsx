import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetUniverseStructuresStructureId,
} from "@jitaspace/esi-client";

import { TypeAvatar } from "./TypeAvatar";

export type StructureAvatarProps = Omit<AvatarProps, "src"> & {
  structureId?: string | number | null;
};

export const StructureAvatar = memo(
  ({ structureId, ...otherProps }: StructureAvatarProps) => {
    const { scopes, isTokenValid } = useEsiClientContext();
    const { data } = useGetUniverseStructuresStructureId(
      typeof structureId === "string"
        ? parseInt(structureId)
        : structureId ?? 1,
      {},
      {
        swr: {
          enabled:
            isTokenValid &&
            !!structureId &&
            scopes.includes("esi-universe.read_structures.v1"),
        },
      },
    );

    return (
      <TypeAvatar
        typeId={data?.data.type_id}
        variation="render"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
StructureAvatar.displayName = "StructureAvatar";