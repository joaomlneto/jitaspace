"use client";

import React from "react";
import { Text } from "@mantine/core";

import { useCharacterLocation } from "@jitaspace/hooks";

import { SolarSystemCard } from "~/components/Card";
import { StationCard } from "~/components/Card/StationCard";


export type CharacterLocationCardProps = {
  characterId: number;
  fallback?: React.ReactNode;
  hideFallback?: boolean;
};

export const CharacterLocationCard = ({
  characterId,
  fallback,
  hideFallback = false,
}: CharacterLocationCardProps) => {
  const { data } = useCharacterLocation(characterId);

  if (!data) {
    return hideFallback
      ? null
      : fallback ?? (
          <Text size="xs" c="dimmed">
            Character location not available
          </Text>
        );
  }

  if (data.data.station_id) {
    return <StationCard stationId={data.data.station_id} />;
  }

  return <SolarSystemCard solarSystemId={data.data.solar_system_id} />;
};
