"use client";

import type { AvatarProps } from "@mantine/core";
import React, { memo } from "react";
import { Avatar, Skeleton } from "@mantine/core";

import type { ResolvableEntityCategory } from "@jitaspace/hooks";
import { UnknownIcon } from "@jitaspace/eve-icons";
import { useEsiName } from "@jitaspace/hooks";
import { getAvatarSize } from "@jitaspace/utils";

import { AllianceAvatar } from "./AllianceAvatar";
import { sizes } from "./Avatar.styles";
import { CharacterAvatar } from "./CharacterAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { FactionAvatar } from "./FactionAvatar";
import { TypeAvatar } from "./TypeAvatar";

export type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  entityId?: string | number;
  category?: ResolvableEntityCategory;
  variation?: string;
};

export const EveEntityAvatar = memo(
  ({
    entityId,
    variation,
    category: categoryHint,
    ...otherProps
  }: EveEntityAvatarProps) => {
    const { category, loading, error } = useEsiName(entityId, categoryHint);
    entityId =
      typeof entityId === "string" ? Number.parseInt(entityId, 10) : entityId;

    if (entityId === undefined || loading) {
      return (
        <Skeleton
          radius={otherProps.radius}
          height={otherProps.size}
          width={otherProps.size}
          circle
        >
          <Avatar
            size={otherProps.size}
            radius={otherProps.radius}
            {...otherProps}
          />
        </Skeleton>
      );
    }

    if (!category || error) {
      const size = getAvatarSize({
        size: otherProps.size ?? "md",
        sizes,
      });
      return <UnknownIcon width={size} height={size} />;
    }

    if (category === "character" || category === "agent") {
      return <CharacterAvatar characterId={entityId} {...otherProps} />;
    }

    if (category === "corporation") {
      return <CorporationAvatar corporationId={entityId} {...otherProps} />;
    }

    if (category === "alliance") {
      return <AllianceAvatar allianceId={entityId} {...otherProps} />;
    }

    if (category === "inventory_type") {
      return (
        <TypeAvatar typeId={entityId} variation={variation} {...otherProps} />
      );
    }

    // solar_system / station / structure are type-backed entities: their avatar
    // is the underlying type's render, which requires resolving id -> type_id
    // (a fetch, plus an authenticated character for private structures). This
    // generic, fetch-light dispatcher can't do that — callers needing those
    // avatars use the smart Avatar wrappers in apps/web. Here they fall through
    // to a bare Avatar below.
    if (category === "faction") {
      return <FactionAvatar factionId={entityId} {...otherProps} />;
    }

    // FIXME: Add more ranges! missing region and constellation

    return <Avatar {...otherProps} />;
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
