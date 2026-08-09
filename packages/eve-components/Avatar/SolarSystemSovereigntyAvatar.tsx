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
  StarAvatar,
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
    // `StarAvatar` renders the star's *type*, so resolve the system's star to
    // its type id. Only the no-sovereignty fallback actually needs it, so gate
    // the fetch on that branch (the hook still runs every render, so hook order
    // stays stable).
    const needsStar =
      !sov?.alliance_id && !sov?.corporation_id && !sov?.faction_id;
    const { data: star } = useStar(data?.data.star_id ?? 0, undefined, {
      query: { enabled: needsStar },
    });

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

    // if not, show a star avatar (resolved from the star's type)
    return <StarAvatar typeId={star?.data.type_id} {...otherProps} />;
  },
);
SolarSystemSovereigntyAvatar.displayName = "SolarSystemSovereigntyAvatar";
