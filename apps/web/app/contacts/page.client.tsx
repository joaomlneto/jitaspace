"use client";

import { useMemo } from "react";
import {
  Alert,
  Chip,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import { ContactsIcon } from "@jitaspace/eve-icons";
import {
  useMultipleAllianceContacts,
  useMultipleAllianceContactsLabels,
  useMultipleCharacterContacts,
  useMultipleCharacterContactsLabels,
  useMultipleCorporationContacts,
  useMultipleCorporationContactsLabels,
} from "@jitaspace/hooks";

import type {
  ContactRow,
  ContactSource,
  ContactSourceKind,
} from "~/components/Contacts";
import {
  activeSourceKeys,
  ContactsDataTable,
  contactSourceKey,
  nextSourceSelection,
  toContactRows,
} from "~/components/Contacts";

const SOURCE_KIND_LABELS: Record<ContactSourceKind, string> = {
  character: "Characters",
  corporation: "Corporations",
  alliance: "Alliances",
};

const SOURCE_KINDS = Object.keys(SOURCE_KIND_LABELS) as ContactSourceKind[];

export default function ContactsPageClient() {
  const characters = useMultipleCharacterContacts();
  const characterLabels = useMultipleCharacterContactsLabels();
  const corporations = useMultipleCorporationContacts();
  const corporationLabels = useMultipleCorporationContactsLabels();
  const alliances = useMultipleAllianceContacts();
  const allianceLabels = useMultipleAllianceContactsLabels();

  // The subject ids come from the hooks themselves, which have already
  // filtered to the characters that granted each kind's scope — and
  // deduplicated corporations and alliances shared by several characters. So
  // this lists exactly the contact lists that can be read.
  const sources = useMemo<ContactSource[]>(
    () => [
      ...characters.subjectIds.map((subjectId) => ({
        kind: "character" as const,
        subjectId,
      })),
      ...corporations.subjectIds.map((subjectId) => ({
        kind: "corporation" as const,
        subjectId,
      })),
      ...alliances.subjectIds.map((subjectId) => ({
        kind: "alliance" as const,
        subjectId,
      })),
    ],
    [characters.subjectIds, corporations.subjectIds, alliances.subjectIds],
  );

  // `null` (no param) means "every source", so a bare /contacts shows them all
  // without enumerating them into the URL. An explicit empty array is a real
  // choice — the user deselected everything — and stays empty.
  const [selectedKeys, setSelectedKeys] = useQueryState(
    "sources",
    parseAsArrayOf(parseAsString),
  );

  const activeKeys = useMemo(
    () => activeSourceKeys(selectedKeys, sources),
    [selectedKeys, sources],
  );

  const allRows = useMemo<ContactRow[]>(
    () => [
      ...toContactRows("character", characters.data, characterLabels.data),
      ...toContactRows(
        "corporation",
        corporations.data,
        corporationLabels.data,
      ),
      ...toContactRows("alliance", alliances.data, allianceLabels.data),
    ],
    [
      characters.data,
      characterLabels.data,
      corporations.data,
      corporationLabels.data,
      alliances.data,
      allianceLabels.data,
    ],
  );

  const rows = useMemo(
    () => allRows.filter((row) => activeKeys.has(contactSourceKey(row.source))),
    [allRows, activeKeys],
  );

  const isPending =
    characters.isPending || corporations.isPending || alliances.isPending;

  // Skeleton rows only while a source the user asked to see is still on its
  // way, so a deselected source that is slow to load — even one of the same
  // kind — neither holds back the "no sources selected" message nor an empty
  // list that has already loaded. Before the sources are known (the auth store
  // rehydrating), anything pending counts.
  const pendingKeys = useMemo(
    () =>
      new Set([
        ...characters.pendingSubjectIds.map((subjectId) =>
          contactSourceKey({ kind: "character", subjectId }),
        ),
        ...corporations.pendingSubjectIds.map((subjectId) =>
          contactSourceKey({ kind: "corporation", subjectId }),
        ),
        ...alliances.pendingSubjectIds.map((subjectId) =>
          contactSourceKey({ kind: "alliance", subjectId }),
        ),
      ]),
    [
      characters.pendingSubjectIds,
      corporations.pendingSubjectIds,
      alliances.pendingSubjectIds,
    ],
  );
  const isSelectionPending =
    sources.length === 0
      ? isPending
      : [...activeKeys].some((key) => pendingKeys.has(key));

  // A source whose labels failed still shows its contacts, with label ids in
  // place of names, so it is reported apart from one whose contacts failed —
  // and not at all when its contacts failed too, since then there is nothing
  // for the labels to name.
  const contactErrors = [
    ...characters.errors.map((error) => ({
      ...error,
      kind: "character" as const,
    })),
    ...corporations.errors.map((error) => ({
      ...error,
      kind: "corporation" as const,
    })),
    ...alliances.errors.map((error) => ({
      ...error,
      kind: "alliance" as const,
    })),
  ];
  const failedContactKeys = new Set(
    contactErrors.map((error) => contactSourceKey(error)),
  );
  const labelErrors = [
    ...characterLabels.errors.map((error) => ({
      ...error,
      kind: "character" as const,
    })),
    ...corporationLabels.errors.map((error) => ({
      ...error,
      kind: "corporation" as const,
    })),
    ...allianceLabels.errors.map((error) => ({
      ...error,
      kind: "alliance" as const,
    })),
  ].filter((error) => !failedContactKeys.has(contactSourceKey(error)));
  const errors = [
    ...contactErrors.map((error) => ({ ...error, what: "contacts" })),
    ...labelErrors.map((error) => ({ ...error, what: "labels" })),
  ];

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <ContactsIcon width={48} />
          <Title order={1}>Contacts</Title>
        </Group>

        {sources.length === 0 && !isPending && (
          <Alert color="yellow" title="No contacts available">
            None of your characters have granted contacts access. Sign in again
            and approve the character, corporation or alliance contacts
            permissions to see contacts here.
          </Alert>
        )}

        {sources.length > 1 && (
          <Chip.Group
            multiple
            value={[...activeKeys]}
            onChange={(value) => {
              void setSelectedKeys(nextSourceSelection(value, sources));
            }}
          >
            <Stack gap="xs">
              {SOURCE_KINDS.map((kind) => {
                const ofKind = sources.filter((source) => source.kind === kind);
                if (ofKind.length === 0) return null;
                return (
                  <Group key={kind} gap="xs">
                    <Text size="sm" c="dimmed" w={100}>
                      {SOURCE_KIND_LABELS[kind]}
                    </Text>
                    {ofKind.map((source) => (
                      <Chip
                        key={contactSourceKey(source)}
                        value={contactSourceKey(source)}
                        size="sm"
                      >
                        <Group gap={6} wrap="nowrap" component="span">
                          <EveEntityAvatar
                            entityId={source.subjectId}
                            category={source.kind}
                            size={16}
                          />
                          <EveEntityName
                            span
                            entityId={source.subjectId}
                            category={source.kind}
                          />
                        </Group>
                      </Chip>
                    ))}
                  </Group>
                );
              })}
            </Stack>
          </Chip.Group>
        )}

        {errors.length > 0 && (
          <Alert
            color="orange"
            title={
              contactErrors.length > 0
                ? "Some contacts could not be loaded"
                : "Some contact labels could not be loaded"
            }
          >
            <Stack gap={2}>
              {errors.map((error) => (
                <Text
                  key={`${error.what}:${error.kind}:${error.subjectId}`}
                  size="sm"
                >
                  <EveEntityName span inherit entityId={error.subjectId} />
                  {error.what === "labels"
                    ? " (labels, shown as numbers): "
                    : ": "}
                  {error.error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <ContactsDataTable
          contacts={rows}
          sources={sources}
          emptyText={
            sources.length > 1 && activeKeys.size === 0
              ? "No sources selected. Pick one above to see its contacts."
              : undefined
          }
          // Skeleton rows until the first contacts land, so the table holds
          // its height instead of growing into place.
          isLoading={isSelectionPending && rows.length === 0}
        />
      </Stack>
    </Container>
  );
}
