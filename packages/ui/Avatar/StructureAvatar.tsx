import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseStructuresStructureId } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/hooks";

import { TypeAvatar } from "./TypeAvatar";

export type StructureAvatarProps = Omit<AvatarProps, "src"> & {
  structureId?: string | number | null;
};

export const StructureAvatar = memo(
  ({ structureId, ...otherProps }: StructureAvatarProps) => {
    const { scopes, isTokenValid, accessToken } = useEsiClientContext();
    const { data } = useGetUniverseStructuresStructureId(
      typeof structureId === "string"
        ? parseInt(structureId)
        : structureId ?? 1,
      { token: accessToken },
      {},
      {
        query: {
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
