"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useDogmaEffect } from "@jitaspace/hooks";
import { DogmaEffectName as UIDogmaEffectName } from "@jitaspace/ui";

export type DogmaEffectNameProps = TextProps & {
  effectId?: number;
};

export const DogmaEffectName = memo(
  ({ effectId, ...otherProps }: DogmaEffectNameProps) => {
    const { data } = useDogmaEffect(effectId ?? 0);
    return <UIDogmaEffectName name={data?.data.name} {...otherProps} />;
  },
);
DogmaEffectName.displayName = "DogmaEffectName";
