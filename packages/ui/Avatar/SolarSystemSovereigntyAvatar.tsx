"use client";

import React, { memo, useMemo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useSolarSystem, useSolarSystemSovereignty } from "@jitaspace/hooks";

import { AllianceAvatar } from "./AllianceAvatar";
import { CorporationAvatar } from "./CorporationAvatar";
import { FactionAvatar } from "./FactionAvatar";
import { StarAvatar } from "./StarAvatar";


export type SolarSystemSovereigntyAvatarProps = Omit<AvatarProps, "src"> & {
  solarSystemId?: string | number | null;
};

export const SolarSystemSovereigntyAvatar = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemSovereigntyAvatarProps) => {
    const normalizedSolarSystemId = useMemo(
      () =>
        typeof solarSystemId === "string"
          ? parseInt(solarSystemId)
          : solarSystemId ?? 1,
      [solarSystemId],
    );
    const { data } = useSolarSystem(normalizedSolarSystemId);
    const sov = useSolarSystemSovereignty(normalizedSolarSystemId);

    // if sov has an alliance, show an alliance avatar
    if (sov?.alliance_id) {
      return <AllianceAvatar allianceId={sov.alliance_id} {...otherProps} />;
    }

    // if sov has a corporation (but no alliance?), show the corporation avatar
    if (sov?.corporation_id) {
      return (
        <CorporationAvatar corporationId={sov.corporation_id} {...otherProps} />
      );
    }

    // if sov has a faction, show a faction avatar
    if (sov?.faction_id) {
      return <FactionAvatar factionId={sov.faction_id} {...otherProps} />;
    }

    // if not, show a star avatar
    return <StarAvatar starId={data?.data.star_id} {...otherProps} />;
  },
);
SolarSystemSovereigntyAvatar.displayName = "SolarSystemSovereigntyAvatar";
