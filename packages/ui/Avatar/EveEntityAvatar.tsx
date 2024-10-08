"use client";

import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import { UnknownIcon } from "@jitaspace/eve-icons";
import { useEsiName, type ResolvableEntityCategory } from "@jitaspace/hooks";
import { getAvatarSize } from "@jitaspace/utils";

import { AllianceAvatar } from "./AllianceAvatar";
import { sizes } from "./Avatar.styles";
import { CharacterAvatar } from "./CharacterAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { FactionAvatar } from "./FactionAvatar";
import { SolarSystemStarAvatar } from "./SolarSystemStarAvatar";
import { StationAvatar } from "./StationAvatar";
import { StructureAvatar } from "./StructureAvatar";
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
    entityId = typeof entityId === "string" ? parseInt(entityId) : entityId;

    if (entityId === undefined || loading) {
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

    if (category === "inventory_type") {
      return (
        <TypeAvatar typeId={entityId} variation={variation} {...otherProps} />
      );
    }

    if (category === "solar_system") {
      return <SolarSystemStarAvatar solarSystemId={entityId} {...otherProps} />;
    }

    if (category === "station") {
      return <StationAvatar stationId={entityId} {...otherProps} />;
    }

    if (category === "structure") {
      return <StructureAvatar structureId={entityId} {...otherProps} />;
    }

    if (category === "faction") {
      return <FactionAvatar factionId={entityId} {...otherProps} />;
    }

    // FIXME: Add more ranges! missing region and constellation

    return <Avatar {...otherProps} />;
  },
);
EveEntityAvatar.displayName = "EveEntityAvatar";
