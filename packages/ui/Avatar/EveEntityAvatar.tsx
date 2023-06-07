import { memo, useEffect, useState } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { postUniverseNames } from "@jitaspace/esi-client";
import { esiImageSizeClamp, getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";

type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  id?: string | number | null;
};

export const EveEntityAvatar = memo(
  ({ id, size, ...avatarProps }: EveEntityAvatarProps) => {
    const [category, setCategory] = useState<string | undefined>();

    useEffect(() => {
      if (!id) {
        return;
      }

      postUniverseNames([Number(id)], {}, {})
        .then((data) => {
          const categoryName = data.data[0]?.category;
          setCategory(
            categoryName === "character"
              ? "characters"
              : categoryName === "corporation"
              ? "corporations"
              : categoryName === "alliance"
              ? "alliances"
              : undefined,
          );
        })
        .catch((error) => {
          console.log(error);
        });
    }, [id]);

    const imageSize = esiImageSizeClamp(
      getAvatarSize({
        size: size ?? "md",
        sizes,
      }),
    );

    const variation =
      category === "characters"
        ? "portrait"
        : category === "corporations"
        ? "logo"
        : category === "alliances"
        ? "logo"
        : undefined;
    if (category && !variation) {
      console.log("Unknown category", category, id, variation);
    }

    const src = `https://images.evetech.net/${category}/${id}/${variation}?size=${imageSize}`;
    return (
      <Avatar
        src={id && category && variation ? src : undefined}
        size={size}
        alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
        {...avatarProps}
      />
    );
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
