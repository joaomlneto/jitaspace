"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Chip,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { collectionMeta, fetchBuildChanges } from "~/lib/history";
import { fetchResourceIndex } from "~/lib/resource-history";
import { EntityChangeSections } from "./_entity-sections";
import { ResourceChanges } from "./_resource-sections";

export default function BuildHistoryClient({ build }: { build: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["history-build", build],
    queryFn: () => fetchBuildChanges(build),
    staleTime: Infinity,
  });
  const { data: resourceIndex, isLoading: resLoading } = useQuery({
    queryKey: ["resource-index"],
    queryFn: fetchResourceIndex,
    staleTime: Infinity,
  });
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  const [selected, setSelected] = useState<string[] | null>(null);

  if (isLoading || resLoading) return <Loader />;

  const resourceBuild = resourceIndex?.builds.find((b) => b.build === build);

  // No decoded-SDE changes and no resource-level changes ⇒ nothing to show.
  if (!data && !resourceBuild) {
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
  const seenCollections = data
    ? [...new Set(data.changes.map((c) => c.collection ?? "types"))]
    : [];
  const active = selected ?? seenCollections;
  const visibleChanges = (data?.changes ?? []).filter((c) =>
    active.includes(c.collection ?? "types"),
  );

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Build {build}</Title>
          <Group gap="xs" mt={4}>
            <Text c="dimmed" size="sm">
              {data?.date ?? resourceBuild?.date ?? "date unknown"}
              {data
                ? ` · ${visibleChanges.length.toLocaleString()} changes ·`
                : ""}
            </Text>
            {data && (
              <Chip.Group multiple value={active} onChange={setSelected}>
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

        {resourceBuild && (
          <ResourceChanges
            build={build}
            files={resourceBuild.files}
            strings={resourceBuild.strings}
          />
        )}

        {data && visibleChanges.length === 0 && (
          <Text size="sm" c="dimmed">
            No changes match the selected collections.
          </Text>
        )}
        {data && <EntityChangeSections changes={visibleChanges} />}
      </Stack>
    </Container>
  );
}
