"use client";

import { Container, Group, Select, Stack, Switch, Title } from "@mantine/core";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";

import { ShipsIcon } from "@jitaspace/eve-icons";
import {
  DEFAULT_SHIP_TREE_FACTION_SLUG,
  getShipTreeFactionBySlug,
  isShipTreeFactionSlug,
  SHIP_TREE_FACTION_SLUGS,
  SHIP_TREE_FACTIONS,
} from "@jitaspace/ship-tree";

import { ShipTreePanel } from "~/components/ShipTree";

const FACTION_OPTIONS = SHIP_TREE_FACTIONS.map(({ slug, name }) => ({
  value: slug,
  label: name,
}));

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
              <Select
                label="Faction"
                data={FACTION_OPTIONS}
                value={factionSlug}
                allowDeselect={false}
                onChange={(value) => {
                  if (value !== null && isShipTreeFactionSlug(value)) {
                    void setFactionSlug(value);
                  }
                }}
                w={260}
              />
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
          h={{ base: 360, sm: "calc(100dvh - 280px)" }}
          mih={{ base: 360, sm: 480 }}
        />
      </Stack>
    </Container>
  );
}
