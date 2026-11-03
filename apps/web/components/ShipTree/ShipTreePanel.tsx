"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Anchor, Group, Stack, Text } from "@mantine/core";

import type {
  FactionIdentifier,
  ShipTreeViewProps,
} from "@jitaspace/ship-tree";
import { CharacterName } from "@jitaspace/eve-components";
import {
  useAuthStoreHasHydrated,
  useCharacterSkillQueue,
  useCharacterSkills,
  useEsiAcceptLanguage,
  useMarketPrices,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { getSkillInTraining, ShipTreeView } from "@jitaspace/ship-tree";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import { loginWithEveOnline } from "~/lib/eveOnlineLogin";
import { usePreferencesStore } from "~/lib/preferences";
import {
  DEFAULT_SHIP_TREE_DEBUG_OPTIONS,
  ShipTreeDebugControls,
  shipTreeDebugViewProps,
} from "./ShipTreeDebugControls";

const SKILLS_SCOPE = "esi-skills.read_skills.v1";
const SKILL_QUEUE_SCOPE = "esi-skills.read_skillqueue.v1";

export interface ShipTreePanelProps {
  faction: FactionIdentifier;
  isOmega: boolean;
  /** The page's own controls, drawn left of the skills status. */
  controls?: ReactNode;
  h?: ShipTreeViewProps["h"];
  mih?: ShipTreeViewProps["mih"];
  /** The faction whose summary bubble to pin over the tree; none if omitted. */
  summaryFaction?: ShipTreeViewProps["summaryFaction"];
  /** Pinned to the tree's top-left corner, above the summary; see `ShipTreeView`. */
  cornerControls?: ShipTreeViewProps["cornerControls"];
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
  summaryFaction,
  cornerControls,
}: Readonly<ShipTreePanelProps>) {
  const hasHydrated = useAuthStoreHasHydrated();
  const character = useSelectedCharacter();
  // `0` is "no character": the hook stays disabled until it has a token.
  const { hasToken, data, isLoading, isError } = useCharacterSkills(
    character?.characterId ?? 0,
  );
  // Stays disabled without the queue scope; the tree just highlights nothing.
  const { data: queue } = useCharacterSkillQueue(character?.characterId ?? 0);
  const skills = data?.data.skills;
  const training = useMemo(
    () => getSkillInTraining(queue?.data, skills),
    [queue?.data, skills],
  );

  // ESI's market average, the price the game shows as estimated. Public, so it
  // loads with or without a character.
  const { data: marketPrices } = useMarketPrices();
  const prices = useCallback(
    (typeId: number) => marketPrices[typeId]?.average_price,
    [marketPrices],
  );

  // Number format for tooltip prices and bonuses: the language chosen in
  // Settings, which is also what ESI answers in.
  const locale = useEsiAcceptLanguage();

  // Settings → Experimental. Off, the tree keeps the library's defaults.
  const debugMode = usePreferencesStore((state) => state.shipTreeDebugMode);
  const [debugOptions, setDebugOptions] = useState(
    DEFAULT_SHIP_TREE_DEBUG_OPTIONS,
  );
  const debugViewProps = useMemo(
    () => (debugMode ? shipTreeDebugViewProps(debugOptions) : {}),
    [debugMode, debugOptions],
  );
  const showPrices = !debugMode || debugOptions.prices;
  const showTraining = !debugMode || debugOptions.training;

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

      {debugMode && (
        <ShipTreeDebugControls
          value={debugOptions}
          onChange={setDebugOptions}
        />
      )}

      <ShipTreeView
        faction={faction}
        skills={skills}
        training={showTraining ? training : undefined}
        prices={showPrices ? prices : undefined}
        locale={locale}
        {...debugViewProps}
        isOmega={isOmega}
        h={h}
        mih={mih}
        summaryFaction={summaryFaction}
        cornerControls={cornerControls}
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
        {!grantedScopes.includes(SKILL_QUEUE_SCOPE) && (
          <>
            {" · "}
            <Anchor
              component="button"
              inherit
              onClick={() => {
                loginWithEveOnline([...grantedScopes, SKILL_QUEUE_SCOPE]);
              }}
            >
              Show the skill in training
            </Anchor>
          </>
        )}
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
          loginWithEveOnline([
            ...new Set([...grantedScopes, SKILLS_SCOPE, SKILL_QUEUE_SCOPE]),
          ]);
        }}
      />
    </Group>
  );
}
