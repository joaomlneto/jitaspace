"use client";

import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseStructuresStructureId } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { TypeAvatar } from "./TypeAvatar";


export type StructureAvatarProps = Omit<AvatarProps, "src"> & {
  characterId?: number;
  structureId?: string | number | null;
};

export const StructureAvatar = memo(
  ({ characterId, structureId, ...otherProps }: StructureAvatarProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-universe.read_structures.v1"],
    });
    const { data } = useGetUniverseStructuresStructureId(
      typeof structureId === "string"
        ? parseInt(structureId)
        : structureId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: !!structureId && accessToken !== null,
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
