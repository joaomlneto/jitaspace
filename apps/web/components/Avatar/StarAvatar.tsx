"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useStar } from "@jitaspace/hooks";
import { StarAvatar as UIStarAvatar } from "@jitaspace/ui";

export type StarAvatarProps = Omit<AvatarProps, "src"> & {
  starId?: number;
};

export const StarAvatar = memo(({ starId, ...otherProps }: StarAvatarProps) => {
  const { data } = useStar(starId);
  return <UIStarAvatar typeId={data?.typeID} {...otherProps} />;
});
StarAvatar.displayName = "StarAvatar";
