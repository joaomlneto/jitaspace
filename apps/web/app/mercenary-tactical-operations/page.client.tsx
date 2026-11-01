"use client";

import { useMemo } from "react";
import {
  Alert,
  Button,
  Chip,
  Container,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { WindowMercenaryIcon } from "@jitaspace/eve-icons";
import {
  MERCENARY_TACTICAL_OPERATIONS_SCOPE,
  useAuthenticatedCharacterIds,
  useAuthStore,
  useAuthStoreHasHydrated,
  useCharactersMercenaryTacticalOperations,
  useMultipleCharacterStructuresMercenaryDens,
} from "@jitaspace/hooks";
import { LoginWithEveOnlineButton } from "@jitaspace/ui";

import type { MercenaryTacticalOperationKind } from "~/components/MercenaryTacticalOperations";
import {
  countByState,
  filterOperationRows,
  mercenaryTacticalOperationsClasses,
  MercenaryTacticalOperationsTable,
  nextSelection,
  OPERATION_STATE_LABELS,
  OPERATION_STATES,
  toOperationRows,
} from "~/components/MercenaryTacticalOperations";
import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

/** Where each Mercenary Den is: optional, the page works without it. */
const DENS_SCOPE: ESIScope = "esi-structures.read_character.v1";
const PAGE_SCOPES: ESIScope[] = [
  MERCENARY_TACTICAL_OPERATIONS_SCOPE,
  DENS_SCOPE,
];

export interface MercenaryTacticalOperationsPageProps {
  /** The SDE's description of every kind of operation, read at build time. */
  kinds: MercenaryTacticalOperationKind[];
}

/**
 * The height of the characters row, whichever of its states it is in: a
 * skeleton before the session loads, the login button, or the characters.
 * Fixed, so the row appearing after hydration does not push the table down.
 */
const FILTER_ROW_HEIGHT = 34;

/**
 * One character that cannot be shown, as a button that signs it in again. It
 * sits with the character filter, where the user looks for their characters.
 *
 * The new token replaces the old one, so it asks for every scope the
 * character already granted as well as this page's: asking for this page's
 * alone would quietly take the rest of the app away from that character.
 */
function UnavailableCharacter({
  characterId,
}: Readonly<{ characterId: number }>) {
  const grantedScopes = useAuthStore(
    (state) => state.characters[characterId]?.accessTokenPayload.scp,
  );
  return (
    <Button
      size="compact-sm"
      variant="default"
      radius="xl"
      leftSection={
        <EveEntityAvatar
          entityId={characterId}
          category="character"
          size={16}
        />
      }
      onClick={() => {
        loginWithEveOnline([...(grantedScopes ?? []), ...PAGE_SCOPES]);
      }}
    >
      <EveEntityName span inherit entityId={characterId} category="character" />
      <Text span inherit fw={400}>
        &nbsp;· Log in again
      </Text>
    </Button>
  );
}

/** The label in front of a filter row, lined up across the rows. */
function FilterLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Text
      size="sm"
      className={mercenaryTacticalOperationsClasses.secondary}
      w={70}
    >
      {children}
    </Text>
  );
}

/**
 * What the characters row shows: a placeholder until the session loads, the
 * login button when logged out, the one character by name, or a chip per
 * character to filter by. Each fits the row's fixed height.
 */
function CharacterFilter({
  hasHydrated,
  isLoggedOut,
  characterIds,
  activeCharacterIds,
  onChange,
}: Readonly<{
  hasHydrated: boolean;
  isLoggedOut: boolean;
  characterIds: number[];
  activeCharacterIds: number[];
  onChange: (characterIds: number[]) => void;
}>) {
  if (!hasHydrated) {
    return <Skeleton height={28} width={160} radius="xl" aria-hidden="true" />;
  }
  if (isLoggedOut) {
    return (
      <LoginWithEveOnlineButton
        size="small"
        // 30px of image and 2px either side: the row's height. A block image
        // drops the line box an inline one sits in, which would add ~9px.
        style={{ padding: 2 }}
        imageProps={{ style: { display: "block" } }}
        onClick={() => {
          loginWithEveOnline(PAGE_SCOPES);
        }}
      />
    );
  }
  if (characterIds.length === 1) {
    // Nothing to choose between, so the character is named, not offered.
    const [characterId] = characterIds;
    return (
      <Group gap={6} wrap="nowrap">
        <EveEntityAvatar
          entityId={characterId}
          category="character"
          size={16}
        />
        <EveEntityName
          span
          size="sm"
          entityId={characterId}
          category="character"
        />
      </Group>
    );
  }
  return (
    <Chip.Group
      multiple
      value={activeCharacterIds.map(String)}
      onChange={(value) => {
        onChange(value.map(Number));
      }}
    >
      {characterIds.map((characterId) => (
        <Chip
          key={characterId}
          value={String(characterId)}
          size="sm"
          variant="light"
        >
          <Group gap={6} wrap="nowrap" component="span">
            <EveEntityAvatar
              entityId={characterId}
              category="character"
              size={16}
            />
            <EveEntityName span entityId={characterId} category="character" />
          </Group>
        </Chip>
      ))}
    </Chip.Group>
  );
}

/**
 * Why the table is empty. Logged out, the table stays (removing it after
 * hydration would shift the page) but says why it is empty rather than that
 * there is nothing to do.
 */
function emptyTextFor({
  isLoggedOut,
  nothingSelected,
  hasOperations,
}: Readonly<{
  isLoggedOut: boolean;
  nothingSelected: boolean;
  hasOperations: boolean;
}>): string {
  if (isLoggedOut) return "Log in to see your operations.";
  if (nothingSelected) {
    return "Nothing selected. Pick a character and a status above to see operations.";
  }
  if (hasOperations) return "No operations match these filters.";
  return "None of your characters has a Mercenary Tactical Operation right now.";
}

export default function MercenaryTacticalOperationsPage({
  kinds,
}: Readonly<MercenaryTacticalOperationsPageProps>) {
  const hasHydrated = useAuthStoreHasHydrated();
  const loggedInCharacterIds = useAuthenticatedCharacterIds();
  const operations = useCharactersMercenaryTacticalOperations();
  const dens = useMultipleCharacterStructuresMercenaryDens();

  const [characterFilter, setCharacterFilter] = useQueryState(
    "characters",
    parseAsArrayOf(parseAsInteger),
  );
  const [stateFilter, setStateFilter] = useQueryState(
    "states",
    parseAsArrayOf(parseAsStringLiteral(OPERATION_STATES)),
  );

  const denPlanets = useMemo(
    () =>
      new Map(
        dens.data.flatMap(({ data }) =>
          data.mercenary_dens.map((den) => [den.id, den.planet_id] as const),
        ),
      ),
    [dens.data],
  );

  const failedOperationIds = useMemo(
    () =>
      new Set(
        operations.errors.flatMap((error) =>
          error.operationId === undefined ? [] : [error.operationId],
        ),
      ),
    [operations.errors],
  );

  const allRows = useMemo(
    () =>
      toOperationRows(
        operations.operations,
        kinds,
        failedOperationIds,
        denPlanets,
      ),
    [operations.operations, kinds, failedOperationIds, denPlanets],
  );

  // A character in the URL that is no longer logged in selects nothing, so
  // the active selection is the URL's intersected with what was queried.
  const activeCharacterIds = useMemo(
    () =>
      characterFilter === null
        ? operations.characterIds
        : operations.characterIds.filter((id) => characterFilter.includes(id)),
    [characterFilter, operations.characterIds],
  );

  // The state counts follow the character filter, so they describe the rows
  // that picking a state would actually show.
  const characterRows = useMemo(
    () =>
      filterOperationRows(allRows, {
        characterIds: characterFilter === null ? null : activeCharacterIds,
        states: null,
      }),
    [allRows, characterFilter, activeCharacterIds],
  );
  const stateCounts = useMemo(
    () => countByState(characterRows),
    [characterRows],
  );
  const rows = useMemo(
    () =>
      filterOperationRows(characterRows, {
        characterIds: null,
        states: stateFilter,
      }),
    [characterRows, stateFilter],
  );

  // Skeleton rows only while a character the user asked to see is still on
  // its way. Before the characters are known (the auth store rehydrating),
  // anything pending counts.
  const isSelectionPending =
    operations.characterIds.length === 0
      ? operations.isPending
      : activeCharacterIds.some((id) =>
          operations.pendingCharacterIds.includes(id),
        );

  const isLoggedOut = hasHydrated && loggedInCharacterIds.length === 0;
  const unavailable = hasHydrated ? operations.unavailableCharacterIds : [];
  const listingErrors = operations.errors.filter(
    (error) => error.operationId === undefined,
  );
  const missingDenLocations =
    operations.characterIds.length > 0 &&
    !dens.isPending &&
    operations.characterIds.some((id) => !dens.subjectIds.includes(id));
  // Counts only once they describe something: not before the session loads,
  // not logged out, and not while the selected characters are still loading.
  const showStateCounts = hasHydrated && !isLoggedOut && !isSelectionPending;

  const emptyText = emptyTextFor({
    isLoggedOut,
    nothingSelected:
      stateFilter?.length === 0 ||
      (characterFilter !== null && activeCharacterIds.length === 0),
    hasOperations: allRows.length > 0,
  });

  // Both filter rows are in the prerendered HTML, whoever turns out to be
  // logged in, so nothing is inserted above the table once the session loads.
  // What only some visitors see (errors, characters left out) goes below it.
  return (
    <Container size="xl">
      <Stack>
        <Group wrap="nowrap">
          <WindowMercenaryIcon width={48} height={48} />
          <Title order={1}>Mercenary Tactical Operations</Title>
        </Group>
        <Text className={mercenaryTacticalOperationsClasses.secondary}>
          The operations your characters&apos; Mercenary Dens are offering.
          Completing one raises its den&apos;s Development, lowers its Anarchy
          and earns infomorphs.
        </Text>

        {/* The chips are `light`: on the red themes a filled chip's white
            label reads about 4:1, short of WCAG AA's 4.5:1. */}
        <Stack gap="xs">
          <Group
            gap="xs"
            mih={FILTER_ROW_HEIGHT}
            role="group"
            aria-label="Characters"
          >
            <FilterLabel>Characters</FilterLabel>
            <CharacterFilter
              hasHydrated={hasHydrated}
              isLoggedOut={isLoggedOut}
              characterIds={operations.characterIds}
              activeCharacterIds={activeCharacterIds}
              onChange={(value) => {
                void setCharacterFilter(
                  nextSelection(value, operations.characterIds),
                );
              }}
            />
            {unavailable.map((characterId) => (
              <UnavailableCharacter
                key={characterId}
                characterId={characterId}
              />
            ))}
          </Group>

          <Chip.Group
            multiple
            value={stateFilter ?? [...OPERATION_STATES]}
            onChange={(value) => {
              void setStateFilter(
                nextSelection(
                  OPERATION_STATES.filter((state) => value.includes(state)),
                  OPERATION_STATES,
                ),
              );
            }}
          >
            <Group
              gap="xs"
              mih={FILTER_ROW_HEIGHT}
              role="group"
              aria-label="Status"
            >
              <FilterLabel>Status</FilterLabel>
              {OPERATION_STATES.map((state) => (
                <Chip key={state} value={state} size="sm" variant="light">
                  {showStateCounts
                    ? `${OPERATION_STATE_LABELS[state]} (${stateCounts[state] ?? 0})`
                    : OPERATION_STATE_LABELS[state]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Stack>

        <MercenaryTacticalOperationsTable
          operations={rows}
          showCharacters={operations.characterIds.length > 1}
          emptyText={emptyText}
          // Skeleton rows until the first operations land, so the table holds
          // its height instead of growing into place.
          isLoading={isSelectionPending && rows.length === 0}
        />

        {operations.isError && (
          <Alert color="orange" title="Some operations could not be loaded">
            <Stack gap={2}>
              {listingErrors.map((error) => (
                <Text key={error.characterId} size="sm">
                  <EveEntityName
                    span
                    inherit
                    entityId={error.characterId}
                    category="character"
                  />
                  {`: ${error.error.message}`}
                </Text>
              ))}
              {failedOperationIds.size > 0 && (
                <Text size="sm">
                  {failedOperationIds.size === 1
                    ? "The details of one operation could not be loaded."
                    : `The details of ${failedOperationIds.size} operations could not be loaded.`}
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        {unavailable.length > 0 && (
          <Text
            size="sm"
            className={mercenaryTacticalOperationsClasses.secondary}
          >
            {unavailable.length === 1
              ? "One character is not shown"
              : `${unavailable.length} characters are not shown`}
            : they have not granted access to their activities, or their session
            has expired. Log in again with the button by their name to include
            their operations.
          </Text>
        )}

        {missingDenLocations && (
          <Text
            size="sm"
            className={mercenaryTacticalOperationsClasses.secondary}
          >
            To see where each Mercenary Den is, log in again and grant access to
            your structures.
          </Text>
        )}
      </Stack>
    </Container>
  );
}
