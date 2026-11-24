"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useMoon } from "@jitaspace/hooks";
import { MoonName as UIMoonName } from "@jitaspace/ui";

export type MoonNameProps = TextProps & {
  moonId?: number;
};

export const MoonName = memo(({ moonId, ...otherProps }: MoonNameProps) => {
  const { data } = useMoon(moonId);
  return <UIMoonName name={data?.name} {...otherProps} />;
});
MoonName.displayName = "MoonName";
