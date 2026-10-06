"use client";

import { useState } from "react";
import { Container, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";

import type { FactionIdentifier } from "@jitaspace/ship-tree";
import { ShipsIcon } from "@jitaspace/eve-icons";
import {
  DEFAULT_SHIP_TREE_FACTION_SLUG,
  getShipTreeFaction,
  getShipTreeFactionBySlug,
  isShipTreeFactionSlug,
  SHIP_TREE_FACTION_SLUGS,
  ShipTreeFactionSelector,
} from "@jitaspace/ship-tree";

import { ShipTreePanel } from "~/components/ShipTree";

export default function ShipTreePage() {
  // Both survive a reload and can be shared as a link. `parseAsStringLiteral`
  // rejects a hand-edited `?faction=` and falls back to the default.
  const [factionSlug, setFactionSlug] = useQueryState(
    "faction",
    parseAsStringLiteral(SHIP_TREE_FACTION_SLUGS).withDefault(
      DEFAULT_SHIP_TREE_FACTION_SLUG,
    ),
  );
  const [isOmega, setIsOmega] = useQueryState(
    "omega",
    parseAsBoolean.withDefault(false),
  );
  const faction = getShipTreeFactionBySlug(factionSlug);
  // The picker shows logos only; the label names the faction under the
  // pointer, or the chosen one.
  const [hovered, setHovered] = useState<FactionIdentifier | null>(null);
  const shownName =
    hovered === null ? faction.name : getShipTreeFaction(hovered).name;

  return (
    <Container size="xl">
      <Stack gap="md">
        <Group>
          <ShipsIcon width={48} />
          <Title>Ship Tree</Title>
        </Group>

        <ShipTreePanel
          faction={faction.id}
          isOmega={isOmega}
          controls={
            <Group align="flex-end">
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Faction: {shownName}
                </Text>
                <ShipTreeFactionSelector
                  value={faction.id}
                  onChange={(id) => {
                    const { slug } = getShipTreeFaction(id);
                    if (isShipTreeFactionSlug(slug)) void setFactionSlug(slug);
                  }}
                  onHoverChange={setHovered}
                />
              </Stack>
              <Switch
                label="Omega clone"
                checked={isOmega}
                onChange={(event) => {
                  void setIsOmega(event.currentTarget.checked);
                }}
                pb={6}
              />
            </Group>
          }
          // On a phone the tree fits to the width and is only ~200px tall, so
          // a full-height viewport would be mostly empty; leave room to pan.
          // Elsewhere it fills what the header, the four-row faction grid and
          // the footer leave.
          h={{ base: 360, sm: "calc(100dvh - 450px)" }}
          mih={{ base: 360, sm: 480 }}
        />
      </Stack>
    </Container>
  );
}
