"use client";

import { useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Chip,
  Container,
  Drawer,
  Group,
  Loader,
  Skeleton,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";

import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { AccessGroupsIcon } from "@jitaspace/eve-icons";
import {
  ACCESS_LISTS_SCOPE,
  useCharactersAccessListDetails,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import {
  AccessListDetails,
  AccessListsDataTable,
  activeCharacterIds,
  nextCharacterSelection,
  rowsManagedBy,
  toAccessListRow,
} from "~/components/AccessLists";
import { loginWithEveOnline } from "~/lib/eveOnlineLogin";

export default function AccessListsPageClient() {
  const accessLists = useCharactersAccessListDetails();
  const selectedCharacter = useSelectedCharacter();

  // `null` (no param) means every character, so a bare /access-lists shows
  // them all without enumerating them into the URL.
  const [selectedCharacterIds, setSelectedCharacterIds] = useQueryState(
    "characters",
    parseAsArrayOf(parseAsInteger),
  );
  // The open list lives in the URL too, so a list can be linked to.
  const [openAccessListId, setOpenAccessListId] = useQueryState(
    "list",
    parseAsInteger,
  );

  const availableCharacterIds = accessLists.characterIds;
  const activeIds = useMemo(
    () => activeCharacterIds(selectedCharacterIds, availableCharacterIds),
    [selectedCharacterIds, availableCharacterIds],
  );

  const allRows = useMemo(
    () => accessLists.data.map(toAccessListRow),
    [accessLists.data],
  );
  const rows = useMemo(
    () => rowsManagedBy(allRows, activeIds),
    [allRows, activeIds],
  );

  // Lists of the selected characters that are still on their way: their
  // listing has not landed, or it has and their details have not.
  const pendingDetailIds = useMemo(
    () => new Set(accessLists.pendingAccessListIds),
    [accessLists.pendingAccessListIds],
  );
  const pendingListCount = accessLists.accessLists.filter(
    (grant) =>
      pendingDetailIds.has(grant.accessListId) &&
      grant.characterIds.some((id) => activeIds.has(id)),
  ).length;
  const isSelectionPending =
    availableCharacterIds.length === 0
      ? accessLists.isPending
      : pendingListCount > 0 ||
        accessLists.pendingCharacterIds.some((id) => activeIds.has(id));

  const openRow = allRows.find((row) => row.id === openAccessListId);
  const isOpenRowPending =
    openRow === undefined &&
    openAccessListId !== null &&
    (accessLists.isPending || pendingDetailIds.has(openAccessListId));

  // An empty name is as good as none, so this tests truthiness.
  let drawerTitle = "Access list";
  if (openRow?.name) drawerTitle = openRow.name;
  else if (openAccessListId !== null) {
    drawerTitle = `Access list ${openAccessListId}`;
  }

  const openAccessList = useCallback(
    (accessListId: number) => void setOpenAccessListId(accessListId),
    [setOpenAccessListId],
  );

  const hasNoCharacters =
    availableCharacterIds.length === 0 && !accessLists.isPending;

  return (
    <Container size="xl">
      <Stack>
        <Group wrap="nowrap">
          <AccessGroupsIcon width={48} height={48} aria-hidden />
          <Title order={1}>Access Lists</Title>
          {isSelectionPending && rows.length > 0 && (
            <Loader size="sm" aria-hidden />
          )}
        </Group>
        <Text>
          The access lists your characters are a Manager or Admin of, with
          everyone each one allows or blocks. EVE does not share the lists a
          character is only a member of.
        </Text>

        {hasNoCharacters && (
          <Alert color="blue" title="No access lists to show">
            <Stack gap="sm" align="flex-start">
              <Text size="sm">
                {selectedCharacter
                  ? "None of your characters have granted access to their access lists. Sign in again and approve reading access lists to see them here."
                  : "Sign in with EVE Online and approve reading access lists to see your characters' lists here."}
              </Text>
              <Button
                size="xs"
                onClick={() =>
                  loginWithEveOnline([
                    ...(selectedCharacter?.accessTokenPayload.scp ?? []),
                    ACCESS_LISTS_SCOPE,
                  ])
                }
              >
                {selectedCharacter ? "Grant access" : "Sign in"}
              </Button>
            </Stack>
          </Alert>
        )}

        {/*
         * Whose lists these are. The row is held at its height while the
         * characters load, so it does not push the table down when they land.
         */}
        {!hasNoCharacters && (
          <Group gap="xs" mih={30} role="group" aria-label="Characters">
            <Text size="sm" fw={500} component="span">
              {availableCharacterIds.length === 1 ? "Character" : "Characters"}
            </Text>
            {availableCharacterIds.length === 0 && (
              <Skeleton height={26} width={180} radius="xl" />
            )}
            {availableCharacterIds.length === 1 && (
              <Group gap={6} wrap="nowrap" component="span">
                <EveEntityAvatar
                  entityId={availableCharacterIds[0]}
                  category="character"
                  size={20}
                />
                <Text size="sm" span>
                  <EveEntityName
                    span
                    inherit
                    entityId={availableCharacterIds[0]}
                    category="character"
                  />
                </Text>
              </Group>
            )}
            {availableCharacterIds.length > 1 && (
              <Chip.Group
                multiple
                value={[...activeIds].map(String)}
                onChange={(value) => {
                  void setSelectedCharacterIds(
                    nextCharacterSelection(
                      value.map(Number),
                      availableCharacterIds,
                    ),
                  );
                }}
              >
                {availableCharacterIds.map((characterId) => (
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
                      <EveEntityName
                        span
                        entityId={characterId}
                        category="character"
                      />
                    </Group>
                  </Chip>
                ))}
              </Chip.Group>
            )}
          </Group>
        )}

        {(accessLists.errors.length > 0 ||
          accessLists.detailErrors.length > 0) && (
          <Alert color="orange" title="Some access lists could not be loaded">
            <Stack gap={2}>
              {accessLists.errors.map((error) => (
                <Text key={`character:${error.characterId}`} size="sm">
                  <EveEntityName
                    span
                    inherit
                    entityId={error.characterId}
                    category="character"
                  />
                  {`'s access lists: ${error.error.message}`}
                </Text>
              ))}
              {accessLists.detailErrors.map((error) => (
                <Text key={`list:${error.accessListId}`} size="sm">
                  {`Access list ${error.accessListId}: ${error.error.message}`}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {/*
         * Announced, so a screen reader hears when the last lists land. Out
         * of the layout: a line appearing and going above the table would
         * shift it twice; the title's spinner shows the same to sighted users.
         */}
        <VisuallyHidden role="status" aria-live="polite">
          {rows.length > 0 && pendingListCount > 0
            ? `Loading ${pendingListCount} more access ${pendingListCount === 1 ? "list" : "lists"}…`
            : ""}
        </VisuallyHidden>

        {!hasNoCharacters && (
          <AccessListsDataTable
            accessLists={rows}
            onOpen={openAccessList}
            // Until the characters are known, assume several: the common
            // case keeps its column header instead of renaming it on load.
            showManagers={availableCharacterIds.length !== 1}
            // Skeleton rows until the first lists land, so the table holds
            // its height instead of growing into place.
            isLoading={isSelectionPending && rows.length === 0}
            emptyText={
              availableCharacterIds.length > 1 && activeIds.size === 0
                ? "No characters selected. Pick one above to see its access lists."
                : "None of your characters manage an access list."
            }
          />
        )}
      </Stack>

      {/*
       * Composed rather than the one-piece <Drawer>, for the header: Mantine
       * renders it as a <header>, which outside a sectioning element is a
       * second banner landmark next to the site's own.
       */}
      <Drawer.Root
        opened={openAccessListId !== null}
        onClose={() => void setOpenAccessListId(null)}
        position="right"
        size="xl"
      >
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Header role="none">
            <Drawer.Title fw={600}>{drawerTitle}</Drawer.Title>
            <Drawer.CloseButton aria-label="Close access list" />
          </Drawer.Header>
          <Drawer.Body>
            {openRow && <AccessListDetails accessList={openRow} />}
            {isOpenRowPending && (
              <Stack role="status" aria-label="Loading access list">
                <Skeleton height={16} width="70%" />
                <Skeleton height={16} width="40%" />
                <Skeleton height={240} />
              </Stack>
            )}
            {!openRow && !isOpenRowPending && (
              <Alert color="gray" title="Access list not found">
                None of your signed-in characters manage this access list, so
                its details cannot be read.
              </Alert>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </Container>
  );
}
