"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Chip,
  Container,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";

import type { ColonyRef } from "@jitaspace/hooks";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import {
  PLANETS_SCOPE,
  useCharacterPlanetLayouts,
  useCharactersWithoutScopes,
  useMultipleCharacterPlanets,
} from "@jitaspace/hooks";

import type { ColonyRow, PiCatalog } from "~/components/PlanetaryInteraction";
import {
  aggregateProduction,
  ColoniesByTypeChart,
  ColoniesDataTable,
  COLONY_STATUS_LABELS,
  COLONY_STATUSES,
  ColonyDetails,
  colonyRowKey,
  ColonyTitle,
  colonyTotals,
  ExtractorsDataTable,
  ExtractorStatusChart,
  formatRelative,
  parseColonyRowKey,
  PiPageHeader,
  ProductionChart,
  ProductionDataTable,
  StorageDataTable,
  toColonyRows,
  toExtractorRows,
  toStorageRows,
  useNow,
} from "~/components/PlanetaryInteraction";
import { StatsGrid } from "~/components/UI";
import { AccessStatusLine } from "./AccessStatusLine";

const COLONY_SCOPES = [PLANETS_SCOPE];

const VIEWS = ["colonies", "extractors", "production", "storage"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  colonies: "Colonies",
  extractors: "Extractors",
  production: "Production",
  storage: "Storage",
};

export default function PlanetaryInteractionPageClient({
  catalog,
}: Readonly<{ catalog: PiCatalog }>) {
  const colonies = useMultipleCharacterPlanets();
  // Logged-in characters left out for not having shared their planets.
  const withoutPlanets = useCharactersWithoutScopes(COLONY_SCOPES);
  const now = useNow();

  // `null` (no param) means every character, so a bare URL shows them all
  // without listing them; an explicit empty list is a real choice and stays.
  const [selectedCharacters, setSelectedCharacters] = useQueryState(
    "characters",
    parseAsArrayOf(parseAsInteger),
  );
  const [statusParam, setStatuses] = useQueryState(
    "status",
    parseAsArrayOf(parseAsStringLiteral(COLONY_STATUSES)),
  );
  // The UI never writes an empty list (clearing every chip removes the
  // param), so one can only come from a hand-edited URL: a bare `?status=` or
  // values nuqs could not parse, which it drops. Either means no filter.
  const statuses = statusParam?.length ? statusParam : null;
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEWS).withDefault("colonies"),
  );
  const [colonyParam, setColonyParam] = useQueryState("colony", parseAsString);

  const characterIds = colonies.subjectIds;
  // With a single character there are no chips to undo a selection with, so
  // one arriving in a shared link is ignored rather than leaving an empty page.
  // Ids in the URL that are not logged-in characters are dropped, and a list
  // of nothing but those (a link from someone else) means every character.
  const activeCharacters = useMemo(() => {
    if (characterIds.length <= 1 || selectedCharacters === null) {
      return new Set(characterIds);
    }
    const known = selectedCharacters.filter((id) => characterIds.includes(id));
    return new Set(
      selectedCharacters.length > 0 && known.length === 0
        ? characterIds
        : known,
    );
  }, [selectedCharacters, characterIds]);

  const shownColonies = useMemo(
    () =>
      colonies.data.filter((colony) => activeCharacters.has(colony.subjectId)),
    [colonies.data, activeCharacters],
  );

  // Only the colonies of the characters shown are opened, so deselecting a
  // character also saves its requests.
  const colonyRefs = useMemo<ColonyRef[]>(
    () =>
      shownColonies.map((colony) => ({
        characterId: colony.subjectId,
        planetId: colony.planet_id,
      })),
    [shownColonies],
  );
  const layouts = useCharacterPlanetLayouts(colonyRefs);
  // Not built from `layouts.errors`, which empties while a failed colony is
  // retried (on every window focus), so the row and the alert would flicker.
  const failedKeys = useMemo(
    () => new Set(layouts.failedKeys),
    [layouts.failedKeys],
  );

  const allRows = useMemo(
    () => toColonyRows(shownColonies, layouts.data, failedKeys, catalog, now),
    [shownColonies, layouts.data, failedKeys, catalog, now],
  );
  const rows = useMemo(() => {
    if (statuses === null) return allRows;
    const wanted = new Set(statuses);
    return allRows.filter(
      (row) => row.summary !== undefined && wanted.has(row.summary.status),
    );
  }, [allRows, statuses]);

  const extractorRows = useMemo(() => toExtractorRows(rows), [rows]);
  const productionRows = useMemo(
    () => aggregateProduction(rows, catalog),
    [rows, catalog],
  );
  const storageRows = useMemo(
    () => toStorageRows(rows, catalog),
    [rows, catalog],
  );
  const totals = useMemo(() => colonyTotals(rows), [rows]);

  // The last colony opened stays in the modal while it animates closed, so its
  // content does not flip to "not available" on the way out. Followed from the
  // URL rather than set on click, so a colony opened by a shared link (read
  // only after hydration) or by back/forward is kept as well.
  const [lastColony, setLastColony] = useState(colonyParam);
  if (colonyParam !== null && colonyParam !== lastColony) {
    setLastColony(colonyParam);
  }
  const showDetails = useCallback(
    (row: ColonyRow) => {
      void setColonyParam(row.key);
    },
    [setColonyParam],
  );
  const detailsRef = parseColonyRowKey(colonyParam ?? lastColony);
  const detailsRow = detailsRef
    ? allRows.find(
        (row) =>
          row.key === colonyRowKey(detailsRef.characterId, detailsRef.planetId),
      )
    : undefined;
  const detailsLayout = detailsRow ? layouts.data[detailsRow.key] : undefined;

  const isPending = colonies.isPending;
  const layoutsPending = layouts.pendingKeys.length > 0;
  // Whether the extractor and production numbers are still on their way: the
  // colony list, then each colony's layout, and a clock to judge expiry by.
  // Before the list arrives there are no layouts to wait for, so counting only
  // those would show zeroes first.
  const summariesPending = isPending || layoutsPending || now === null;
  const showCharacter = characterIds.length > 1;
  const pendingOr = (pending: boolean, value: string) =>
    pending ? "…" : value;

  const stats = [
    { title: "Colonies", value: pendingOr(isPending, String(totals.colonies)) },
    {
      title: "Extractors running",
      value: pendingOr(
        summariesPending,
        String(totals.byStatus.running + totals.byStatus.expiring),
      ),
    },
    {
      title: "Expiring within 24 h",
      value: pendingOr(summariesPending, String(totals.byStatus.expiring)),
    },
    {
      title: "Expired",
      value: pendingOr(summariesPending, String(totals.byStatus.expired)),
    },
    {
      title: "Next expiry",
      value: pendingOr(
        summariesPending,
        totals.nextExpiry === undefined || now === null
          ? "—"
          : formatRelative(totals.nextExpiry, now),
      ),
    },
  ];

  const colonyErrors = colonies.errors;
  let emptyText = "No colonies. Set one up in the planetary view in game.";
  if (characterIds.length === 0) {
    emptyText = "Sign in to see your colonies.";
  } else if (showCharacter && activeCharacters.size === 0) {
    emptyText = "No characters selected. Pick one above to see their colonies.";
  } else if (statuses !== null && allRows.length > 0) {
    emptyText = "No colony matches the selected statuses.";
  }

  return (
    <Container size="xl">
      <Stack>
        <PiPageHeader
          active="colonies"
          title="Planetary Interaction"
          description="Your colonies across every logged-in character: when each extractor program ends, what your factories make, and what is waiting in storage."
        />

        <AccessStatusLine
          isPending={isPending}
          hasAccess={characterIds.length > 0}
          scopes={COLONY_SCOPES}
          signedOut="Sign in with a character that shares its planets to see your colonies."
          summary={`${colonies.data.length} ${colonies.data.length === 1 ? "colony" : "colonies"} across ${characterIds.length} ${characterIds.length === 1 ? "character" : "characters"}`}
          missing={withoutPlanets}
          missingText={(names) => `Planets not shared by ${names}.`}
        />

        {/* Status first: it is always there, so the character chips that
            arrive after hydration grow the row sideways, not downwards. */}
        <Group gap="lg" mih={30} align="center">
          <Chip.Group
            multiple
            value={statuses ?? []}
            onChange={(value) => {
              void setStatuses(
                value.length === 0
                  ? null
                  : COLONY_STATUSES.filter((status) => value.includes(status)),
              );
            }}
          >
            <Group gap="xs" role="group" aria-label="Colony status">
              <Text size="sm" c="dimmed">
                Status
              </Text>
              {COLONY_STATUSES.map((status) => (
                <Chip key={status} value={status} size="xs" variant="outline">
                  {COLONY_STATUS_LABELS[status]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          {showCharacter && (
            <Chip.Group
              multiple
              value={[...activeCharacters].map(String)}
              onChange={(value) => {
                const next = value.map(Number);
                // Every character is the default, so it stays out of the URL.
                void setSelectedCharacters(
                  next.length === characterIds.length ? null : next,
                );
              }}
            >
              <Group gap="xs" role="group" aria-label="Characters">
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
                        alt=""
                      />
                      <EveEntityName
                        span
                        entityId={characterId}
                        category="character"
                      />
                    </Group>
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          )}
        </Group>

        <StatsGrid data={stats} cols={{ base: 2, sm: 3, lg: 5 }} />

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <ExtractorStatusChart totals={totals} isLoading={summariesPending} />
          <ColoniesByTypeChart rows={rows} isLoading={isPending} />
          <ProductionChart
            rows={productionRows}
            catalog={catalog}
            limit={6}
            isLoading={summariesPending}
          />
        </SimpleGrid>

        {colonyErrors.length > 0 && (
          <Alert color="orange" title="Some colonies could not be loaded">
            <Stack gap={2}>
              {colonyErrors.map((error) => (
                <Text key={error.subjectId} size="sm">
                  <EveEntityName
                    span
                    inherit
                    entityId={error.subjectId}
                    category="character"
                  />
                  : {error.error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
        {failedKeys.size > 0 && (
          <Alert color="orange" title="Some colony layouts could not be loaded">
            {failedKeys.size === 1
              ? "One colony is listed without its extractors, factories and storage."
              : `${failedKeys.size} colonies are listed without their extractors, factories and storage.`}
          </Alert>
        )}

        <Tabs
          value={view}
          onChange={(value) => {
            const next = VIEWS.find((candidate) => candidate === value);
            void setView(next === "colonies" ? null : (next ?? null));
          }}
          keepMounted={false}
        >
          <Tabs.List>
            {VIEWS.map((id) => (
              <Tabs.Tab key={id} value={id}>
                {VIEW_LABELS[id]}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value="colonies" pt="md">
            <ColoniesDataTable
              rows={rows}
              showCharacter={showCharacter}
              now={now}
              // With a status filter, a colony whose layout is still loading
              // has no status yet, so the table waits for the layouts too.
              isLoading={
                (isPending || (statuses !== null && summariesPending)) &&
                rows.length === 0
              }
              emptyText={emptyText}
              onShowDetails={showDetails}
            />
          </Tabs.Panel>
          <Tabs.Panel value="extractors" pt="md">
            <ExtractorsDataTable
              rows={extractorRows}
              catalog={catalog}
              showCharacter={showCharacter}
              now={now}
              isLoading={summariesPending && extractorRows.length === 0}
            />
          </Tabs.Panel>
          <Tabs.Panel value="production" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">
                Hourly flows if every running extractor keeps its starting yield
                and every factory stays supplied. Extractor output drops over a
                program, so real yields are lower.
              </Text>
              <ProductionDataTable
                rows={productionRows}
                catalog={catalog}
                isLoading={summariesPending && productionRows.length === 0}
              />
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="storage" pt="md">
            <StorageDataTable
              rows={storageRows}
              catalog={catalog}
              showCharacter={showCharacter}
              isLoading={summariesPending && storageRows.length === 0}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={colonyParam !== null}
        onClose={() => {
          void setColonyParam(null);
        }}
        size="xl"
        title={detailsRow ? <ColonyTitle row={detailsRow} /> : "Colony"}
        closeButtonProps={{ "aria-label": "Close" }}
      >
        {detailsRow && detailsLayout ? (
          <ColonyDetails
            row={detailsRow}
            layout={detailsLayout}
            catalog={catalog}
            now={now}
          />
        ) : (
          <Text c="dimmed" size="sm">
            {isPending || layoutsPending
              ? "Loading colony…"
              : "This colony is not available."}
          </Text>
        )}
      </Modal>
    </Container>
  );
}
