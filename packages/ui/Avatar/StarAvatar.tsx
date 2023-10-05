import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseStarsStarId } from "@jitaspace/esi-client-kubb";

import { TypeAvatar } from "./TypeAvatar";

export type StarAvatarProps = Omit<AvatarProps, "src"> & {
  starId?: string | number | null;
};

export const StarAvatar = memo(({ starId, ...otherProps }: StarAvatarProps) => {
  const { data } = useGetUniverseStarsStarId(
    typeof starId === "string" ? parseInt(starId) : starId ?? 1,
    {},
    { swr: { enabled: !!starId } },
  );

  return (
    <TypeAvatar
      typeId={data?.data.type_id}
      variation="render"
      size={otherProps.size}
      {...otherProps}
    />
  );
});
StarAvatar.displayName = "StarAvatar";
