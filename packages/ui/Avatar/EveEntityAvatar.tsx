import React, { memo, useEffect, useState } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { postUniverseNames } from "@jitaspace/esi-client";
import {
  allianceIdRanges,
  characterIdRanges,
  corporationIdRanges,
  esiImageSizeClamp,
  getAvatarSize,
  isIdInRanges,
} from "@jitaspace/utils";

import { AllianceAvatar } from "./AllianceAvatar";
import { sizes } from "./Avatar.styles";
import { CharacterAvatar } from "./CharacterAvatar";
import { CorporationAvatar } from "./CorporationAvatar";

type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  id?: string | number | null;
};

export const EveEntityAvatarFallback = memo(
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
EveEntityAvatarFallback.displayName = "EveEntityAvatarFallback";

export const EveEntityAvatar = memo(
  ({ id, ...otherProps }: EveEntityAvatarProps) => {
    id = typeof id === "string" ? parseInt(id) : id;

    if (!id) {
      return <Avatar {...otherProps} />;
    }

    if (isIdInRanges(id, characterIdRanges)) {
      return <CharacterAvatar characterId={id} {...otherProps} />;
    }

    if (isIdInRanges(id, corporationIdRanges)) {
      return <CorporationAvatar corporationId={id} {...otherProps} />;
    }

    if (isIdInRanges(id, allianceIdRanges)) {
      return <AllianceAvatar allianceId={id} {...otherProps} />;
    }

    // FIXME: Add more ranges!

    // Resolve wtf this is in the worst possible way - via a POST request!
    return <EveEntityAvatarFallback id={id} {...otherProps} />;
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
