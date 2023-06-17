import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import { useEsiName } from "@jitaspace/esi-client";
import { UnknownIcon } from "@jitaspace/eve-icons";
import { getAvatarSize } from "@jitaspace/utils";

import { AllianceAvatar } from "./AllianceAvatar";
import { sizes } from "./Avatar.styles";
import { CharacterAvatar } from "./CharacterAvatar";
import { CorporationAvatar } from "./CorporationAvatar";

export type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  entityId: string | number;
};

export const EveEntityAvatar = memo(
  ({ entityId, ...otherProps }: EveEntityAvatarProps) => {
    const { category, loading, error } = useEsiName(entityId);
    entityId = typeof entityId === "string" ? parseInt(entityId) : entityId;

    if (loading) {
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
      </Skeleton>;
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

    // FIXME: Add more ranges!

    return <Avatar {...otherProps} />;
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
