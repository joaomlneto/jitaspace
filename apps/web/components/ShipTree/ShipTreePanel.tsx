"use client";

import type { ReactNode } from "react";
import { Anchor, Group, Stack, Text } from "@mantine/core";

import type {
  FactionIdentifier,
  ShipTreeViewProps,
} from "@jitaspace/ship-tree";
import { CharacterName } from "@jitaspace/eve-components";
import {
  useAuthStoreHasHydrated,
  useCharacterSkills,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { ShipTreeView } from "@jitaspace/ship-tree";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

const SKILLS_SCOPE = "esi-skills.read_skills.v1";

export interface ShipTreePanelProps {
  faction: FactionIdentifier;
  isOmega: boolean;
  /** The page's own controls, drawn left of the skills status. */
  controls?: ReactNode;
  h?: ShipTreeViewProps["h"];
  mih?: ShipTreeViewProps["mih"];
}

/**
 * One faction's ship tree, lit up with the selected character's skills: the
 * body of `/ship-tree`, and the Ship Tree tab of `/faction/[factionId]`.
 */
export function ShipTreePanel({
  faction,
  isOmega,
  controls,
  h,
  mih,
}: Readonly<ShipTreePanelProps>) {
  const hasHydrated = useAuthStoreHasHydrated();
  const character = useSelectedCharacter();
  // `0` is "no character": the hook stays disabled until it has a token.
  const { hasToken, data, isLoading, isError } = useCharacterSkills(
    character?.characterId ?? 0,
  );

  return (
    <Stack gap="md">
      <Group align="flex-end" justify="space-between">
        {controls ?? <div />}

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
        faction={faction}
        skills={data?.data.skills}
        isOmega={isOmega}
        h={h}
        mih={mih}
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
        from a snapshot of EVE&apos;s static data, so it can trail the live game
        until the next update.
      </Text>
    </Stack>
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
