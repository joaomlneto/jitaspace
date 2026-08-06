"use client";

import type { AvatarProps } from "@mantine/core";
import { memo, useMemo } from "react";

import {
  useSolarSystem,
  useSolarSystemSovereignty,
  useStar,
} from "@jitaspace/hooks";
import {
  AllianceAvatar,
  CorporationAvatar,
  FactionAvatar,
  SolarSystemStarAvatar,
} from "@jitaspace/ui";

export type SolarSystemSovereigntyAvatarProps = Omit<AvatarProps, "src"> & {
  solarSystemId?: string | number | null;
};

export const SolarSystemSovereigntyAvatar = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemSovereigntyAvatarProps) => {
    const normalizedSolarSystemId = useMemo(
      () =>
        typeof solarSystemId === "string"
          ? Number.parseInt(solarSystemId, 10)
          : (solarSystemId ?? 1),
      [solarSystemId],
    );
    const { data } = useSolarSystem(normalizedSolarSystemId);
    const sov = useSolarSystemSovereignty(normalizedSolarSystemId);

    // ESI's `star_id` is a star entity id, but the star avatar renders the
    // star's *type*, so the star has to be resolved to get its type id.
    // Passing an undefined id leaves the query disabled, which skips the
    // request while the system is still loading and whenever sovereignty wins
    // below and the star is never rendered.
    const sovereigntyOwnerId =
      sov?.alliance_id ?? sov?.corporation_id ?? sov?.faction_id;
    const { data: star } = useStar(
      sovereigntyOwnerId ? undefined : data?.data.star_id,
    );

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

    // if not, show the avatar for the system's star
    return (
      <SolarSystemStarAvatar typeId={star?.data.type_id} {...otherProps} />
    );
  },
);
SolarSystemSovereigntyAvatar.displayName = "SolarSystemSovereigntyAvatar";
