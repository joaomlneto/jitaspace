"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useMoon } from "@jitaspace/hooks";
import { MoonName as UIMoonName } from "@jitaspace/ui";

export type MoonNameProps = TextProps & {
  moonId?: number;
};

export const MoonName = memo(({ moonId, ...otherProps }: MoonNameProps) => {
  const { data } = useMoon(moonId ?? 0);
  return <UIMoonName name={data?.data.name} {...otherProps} />;
});
MoonName.displayName = "MoonName";
