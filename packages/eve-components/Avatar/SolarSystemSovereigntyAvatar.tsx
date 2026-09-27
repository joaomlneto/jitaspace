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
    // the fetch on that branch. The star id has to be guarded here too: passing
    // `enabled` overrides the generated hook's own id guard, so without it the
    // first render (before the solar-system query resolves) would fire a request
    // for a star we don't know yet.
    const needsStar =
      !sov?.alliance_id && !sov?.corporation_id && !sov?.faction_id;
    const starId = data?.data.star_id;
    const { data: star } = useStar(starId, undefined, {
      query: { enabled: needsStar && starId !== undefined },
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
