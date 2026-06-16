"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useStar } from "@jitaspace/hooks";
import { StarAvatar as UIStarAvatar } from "@jitaspace/ui";

export type StarAvatarProps = Omit<AvatarProps, "src"> & {
  starId?: number;
};

export const StarAvatar = memo(({ starId, ...otherProps }: StarAvatarProps) => {
  const { data } = useStar(starId ?? 0);
  return <UIStarAvatar typeId={data?.data.type_id} {...otherProps} />;
});
StarAvatar.displayName = "StarAvatar";
