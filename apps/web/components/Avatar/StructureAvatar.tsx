"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useStructure } from "@jitaspace/hooks";
import { StructureAvatar as UIStructureAvatar } from "@jitaspace/ui";

export type StructureAvatarProps = Omit<AvatarProps, "src"> & {
  characterId?: number;
  structureId?: number;
};

export const StructureAvatar = memo(
  ({ characterId, structureId, ...otherProps }: StructureAvatarProps) => {
    const { data } = useStructure(structureId ?? 0, characterId);
    return <UIStructureAvatar typeId={data?.data.type_id} {...otherProps} />;
  },
);
StructureAvatar.displayName = "StructureAvatar";
