"use client";

import Link from "next/link";
import {
  Alert,
  Anchor,
  Chip,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import type { BuildPage } from "~/lib/history";
import { collectionMeta } from "~/lib/history";
import { EntityChangeSections } from "./_entity-sections";
import { hasResourceChanges, ResourceChanges } from "./_resource-sections";

export default function BuildHistoryClient({
  data,
}: Readonly<{ data: BuildPage }>) {
  const { build, date, changes, typeNames, files, strings } = data;
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  // No .withDefault(): an absent param is null, matching the "all" sentinel.
  const [selected, setSelected] = useQueryState(
    "collections",
    parseAsArrayOf(parseAsString).withOptions({ history: "replace" }),
  );

  const hasEntityChanges = changes.length > 0;

  // No decoded-SDE changes and no resource-level changes ⇒ nothing to show.
  if (!hasEntityChanges && !hasResourceChanges(files, strings)) {
    return (
      <Container size="md" py="xl">
        <Stack gap="md">
          <Title order={2}>Build {build}</Title>
          <Alert color="gray">
            No recorded changes for this build.{" "}
            <Anchor component={Link} href="/history">
              Back to history
            </Anchor>
          </Alert>
        </Stack>
      </Container>
    );
  }

  // which collections contributed to this build (for the filter chips); empty
  // for a build that only touched raw files / localization strings.
  const seenCollections = [
    ...new Set(changes.map((c) => c.collection ?? "types")),
  ];
  const active = selected ?? seenCollections;
  const visibleChanges = changes.filter((c) =>
    active.includes(c.collection ?? "types"),
  );

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Build {build}</Title>
          <Group gap="xs" mt={4}>
            <Text c="dimmed" size="sm">
              {date ?? "date unknown"}
              {hasEntityChanges
                ? ` · ${visibleChanges.length.toLocaleString()} changes ·`
                : ""}
            </Text>
            {hasEntityChanges && (
              <Chip.Group
                multiple
                value={active}
                onChange={(value) => void setSelected(value)}
              >
                <Group gap={6}>
                  {seenCollections.map((c) => (
                    <Chip
                      key={c}
                      value={c}
                      size="xs"
                      color={collectionMeta(c).color}
                    >
                      {collectionMeta(c).label}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            )}
            <Anchor component={Link} href="/history" size="sm">
              all history
            </Anchor>
          </Group>
        </div>

        <ResourceChanges files={files} strings={strings} />

        {hasEntityChanges && visibleChanges.length === 0 && (
          <Text size="sm" c="dimmed">
            No changes match the selected collections.
          </Text>
        )}
        <EntityChangeSections changes={visibleChanges} typeNames={typeNames} />
      </Stack>
    </Container>
  );
}
