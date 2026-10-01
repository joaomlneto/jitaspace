"use client";

import {
  Anchor,
  Container,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";

import { CharacterName } from "@jitaspace/eve-components";
import { ShipsIcon } from "@jitaspace/eve-icons";
import {
  useAuthStoreHasHydrated,
  useCharacterSkills,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import {
  DEFAULT_SHIP_TREE_FACTION_SLUG,
  getShipTreeFactionBySlug,
  isShipTreeFactionSlug,
  SHIP_TREE_FACTION_SLUGS,
  SHIP_TREE_FACTIONS,
  ShipTreeView,
} from "@jitaspace/ship-tree";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

const SKILLS_SCOPE = "esi-skills.read_skills.v1";

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

  const hasHydrated = useAuthStoreHasHydrated();
  const character = useSelectedCharacter();
  // `0` is "no character": the hook stays disabled until it has a token.
  const { hasToken, data, isLoading, isError } = useCharacterSkills(
    character?.characterId ?? 0,
  );

  return (
    <Container size="xl">
      <Stack gap="md">
        <Group>
          <ShipsIcon width={48} />
          <Title>Ship Tree</Title>
        </Group>

        <Group align="flex-end" justify="space-between">
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

          {hasHydrated && (
            <SkillsStatus
              characterId={character?.characterId}
              grantedScopes={character?.accessTokenPayload.scp ?? []}
              hasToken={hasToken}
              isLoading={isLoading}
              isError={isError}
            />
          )}
        </Group>

        <ShipTreeView
          faction={faction.id}
          skills={data?.data.skills}
          isOmega={isOmega}
          // On a phone the tree fits to the width and is only ~200px tall, so
          // a full-height viewport would be mostly empty; leave room to pan.
          h={{ base: 360, sm: "calc(100dvh - 280px)" }}
          mih={{ base: 360, sm: 480 }}
        />

        <Text size="xs" c="dimmed">
          Drawn by{" "}
          <Anchor
            href="https://github.com/eve-online-tools/node-packages/tree/main/packages/eve-ship-tree"
            target="_blank"
            rel="noreferrer"
            inherit
          >
            @eve-online-tools/eve-ship-tree
          </Anchor>{" "}
          from a snapshot of EVE&apos;s static data, so it can trail the live
          game until the next update.
        </Text>
      </Stack>
    </Container>
  );
}

interface SkillsStatusProps {
  characterId: number | undefined;
  grantedScopes: readonly string[];
  hasToken: boolean;
  isLoading: boolean;
  isError: boolean;
}

/** Says whose skills the tree shows, or how to get the tree to show yours. */
function SkillsStatus({
  characterId,
  grantedScopes,
  hasToken,
  isLoading,
  isError,
}: Readonly<SkillsStatusProps>) {
  if (characterId !== undefined && hasToken) {
    if (isError) {
      return (
        <Text size="sm" c="red">
          Couldn&apos;t load skills for{" "}
          <CharacterName characterId={characterId} span inherit />
        </Text>
      );
    }
    return (
      <Text size="sm" c="dimmed">
        {isLoading ? "Loading skills for " : "Showing the skills of "}
        <CharacterName characterId={characterId} span inherit />
      </Text>
    );
  }

  return (
    <Group gap="sm">
      <Text size="sm" c="dimmed">
        {characterId === undefined
          ? "Log in to see which ships you can fly."
          : "Allow access to your skills to see which ships you can fly."}
      </Text>
      <LoginWithEveOnlineButton
        size="small"
        onClick={() => {
          loginWithEveOnline([...grantedScopes, SKILLS_SCOPE]);
        }}
      />
    </Group>
  );
}
