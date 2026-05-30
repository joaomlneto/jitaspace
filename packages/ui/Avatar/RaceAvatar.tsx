"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { FactionAvatar } from "./FactionAvatar";

export type RaceAvatarProps = Omit<AvatarProps, "src"> & {
  factionId?: string | null;
};

export const RaceAvatar = memo(({ factionId, ...otherProps }: RaceAvatarProps) => {
  return <FactionAvatar factionId={factionId ?? ""} {...otherProps} />;
});
RaceAvatar.displayName = "RaceAvatar";
