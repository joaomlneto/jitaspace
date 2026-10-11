"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Badge, Box, Group, Stack, Text } from "@mantine/core";

import {
  CharacterAnchor,
  SolarSystemAnchor,
  StationAnchor,
  TypeAnchor,
  TypeAvatar,
} from "@jitaspace/eve-components";
import { CharacterAvatar, ISKAmount } from "@jitaspace/ui";

import type { AgentRef, TypeRef } from "~/lib/missionRefs";
import type { MissionKind, MissionTextValues } from "~/lib/missions";
import { MailMessageViewer } from "~/components/EveMail";
import {
  ISK_TYPE_ID,
  MISSION_KIND_LABELS,
  renderMissionText,
} from "~/lib/missions";

export const notAvailableText = "—";

/** The framed square the hero puts its picture in, as on the type page. */
export function HeroImage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Box
      style={{
        width: 128,
        height: 128,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid rgba(108, 132, 151, 0.28)",
        background:
          "radial-gradient(circle at 50% 35%, rgba(44, 66, 88, 0.4), rgba(6, 9, 15, 0.92))",
      }}
    >
      {children}
    </Box>
  );
}

const KIND_COLORS: Record<MissionKind, string> = {
  kill: "red",
  courier: "blue",
  other: "gray",
};

export function MissionKindBadge({
  kind,
  size = "sm",
}: Readonly<{ kind: MissionKind; size?: "xs" | "sm" | "md" | "lg" }>) {
  return (
    <Badge size={size} variant="light" color={KIND_COLORS[kind]}>
      {MISSION_KIND_LABELS[kind]}
    </Badge>
  );
}

export function BooleanBadge({ value }: Readonly<{ value: boolean | null }>) {
  if (value === null) return <>{notAvailableText}</>;
  return (
    <Badge size="sm" variant="light" color={value ? "teal" : "gray"}>
      {value ? "Yes" : "No"}
    </Badge>
  );
}

/** An item, with its icon and a link to its type page. */
export function TypeRefLabel({
  type,
  quantity,
  size = "sm",
}: Readonly<{
  type: TypeRef;
  quantity?: number | null;
  size?: "xs" | "sm" | "md";
}>) {
  if (type.typeId === ISK_TYPE_ID && quantity != null) {
    return <ISKAmount amount={quantity} showFullAmount span fw={600} />;
  }
  return (
    <Group gap={6} wrap="nowrap">
      <TypeAvatar typeId={type.typeId} size={size} />
      <Text span size="sm" component="span">
        {quantity != null && quantity > 1 && (
          <Text span ff="monospace" fw={600}>
            {quantity.toLocaleString("en-US")} ×{" "}
          </Text>
        )}
        <TypeAnchor typeId={type.typeId}>
          {type.name ?? `Type ${type.typeId}`}
        </TypeAnchor>
      </Text>
    </Group>
  );
}

/** An NPC agent: portrait, name, level and where they sit. */
export function AgentLabel({
  agent,
  withLocation = true,
}: Readonly<{ agent: AgentRef; withLocation?: boolean }>) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <CharacterAvatar characterId={agent.characterId} size="md" />
      <Stack gap={0}>
        <Group gap={6} wrap="nowrap">
          <CharacterAnchor characterId={agent.characterId} fw={600}>
            {agent.name ?? `Agent ${agent.characterId}`}
          </CharacterAnchor>
          {agent.level !== null && (
            <Badge size="xs" variant="outline" color="gray">
              L{agent.level}
            </Badge>
          )}
        </Group>
        {(agent.corporationName ?? agent.divisionName) && (
          <Text size="xs" c="dimmed">
            {[agent.divisionName, agent.corporationName]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
        {withLocation && agent.stationId !== null && (
          <Text size="xs" c="dimmed">
            <StationAnchor stationId={agent.stationId} size="xs">
              {agent.stationName ?? `Station ${agent.stationId}`}
            </StationAnchor>
            {agent.solarSystemId !== null && agent.regionName !== null && (
              <>
                {" · "}
                <SolarSystemAnchor
                  solarSystemId={agent.solarSystemId}
                  size="xs"
                >
                  {agent.solarSystemName}
                </SolarSystemAnchor>
                {` (${agent.regionName})`}
              </>
            )}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

/**
 * Mission or dungeon text through the EVE rich-text viewer, with the mission
 * placeholders filled in from `values` (see `renderMissionText`).
 */
export function MissionText({
  text,
  values,
}: Readonly<{ text: string; values?: MissionTextValues }>) {
  const content = useMemo(
    () => renderMissionText(text, values),
    [text, values],
  );
  // Keyed by content: the viewer's editor reads `content` only when it is
  // created, so a value filled in later (the pilot's name) needs a new one.
  return <MailMessageViewer key={content} content={content} />;
}
