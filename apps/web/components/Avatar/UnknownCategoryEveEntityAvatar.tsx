import { useEffect, useMemo, useState } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { esiImageSizeClamp } from "~/utils/math";
import { getAvatarSize } from "~/utils/ui";
import { postUniverseNames } from "~/esi/universe";
import { sizes } from "./Avatar.styles";

type Props = Omit<AvatarProps, "src"> & {
  id?: string | number | null;
};

function _UnknownCategoryEveEntityAvatar({ id, size, ...avatarProps }: Props) {
  const [category, setCategory] = useState<string | undefined>();

  useEffect(() => {
    if (!id) {
      return;
    }

    console.log("resolving name for id ", id);
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
}

export default function UnknownCategoryEveEntityAvatar(props: Props) {
  return useMemo(() => <_UnknownCategoryEveEntityAvatar {...props} />, [props]);
}
