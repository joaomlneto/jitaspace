"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniversePlanetsPlanetId } from "@jitaspace/esi-client";

import { TypeAvatar } from "./TypeAvatar";


export type PlanetAvatarProps = Omit<AvatarProps, "src"> & {
  planetId?: string | number | null;
};

export const PlanetAvatar = memo(
  ({ planetId, ...otherProps }: PlanetAvatarProps) => {
    const { data } = useGetUniversePlanetsPlanetId(
      typeof planetId === "string" ? parseInt(planetId) : planetId ?? 1,
      {},
      {},
      { query: { enabled: !!planetId } },
    );

    return (
      <TypeAvatar
        typeId={data?.data.type_id}
        variation="icon"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
PlanetAvatar.displayName = "PlanetAvatar";
