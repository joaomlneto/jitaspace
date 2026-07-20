"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { BuildRangeChanges } from "~/lib/history";
import { getBuildRangeChanges } from "~/lib/history-actions";
import { EntityChangeSections } from "../build/[build]/_entity-sections";

interface BuildOption {
  build: number;
  date: string | null;
}

function CompareResults({ data }: Readonly<{ data: BuildRangeChanges }>) {
  // A distinct entity may change in more than one collection; count entities.
  const entities = new Set(
    data.changes.map((c) => `${c.entityType ?? "type"} ${c.entityId}`),
  ).size;
  return (
    <Stack gap="lg">
      <Group gap="xs">
        <Text fw={500}>
          build {data.from} → build {data.to}
        </Text>
        <Text c="dimmed" size="sm">
          {data.fromDate ?? "date unknown"} → {data.toDate ?? "date unknown"} ·{" "}
          {entities.toLocaleString()} {entities === 1 ? "entity" : "entities"}{" "}
          changed
        </Text>
      </Group>
      {data.changes.length === 0 ? (
        <Alert color="gray">
          Nothing changed in the tracked static data between these builds.
        </Alert>
      ) : (
        <EntityChangeSections changes={data.changes} />
      )}
    </Stack>
  );
}

export default function CompareBuildsClient({
  builds,
  from,
  to,
}: Readonly<{ builds: BuildOption[]; from?: number; to?: number }>) {
  const router = useRouter();

  const options = useMemo(
    () =>
      builds.map((b) => ({
        value: String(b.build),
        label: b.date ? `${b.build} · ${b.date}` : String(b.build),
      })),
    [builds],
  );

  const [fromSel, setFromSel] = useState<string | null>(
    from != null ? String(from) : null,
  );
  const [toSel, setToSel] = useState<string | null>(
    to != null ? String(to) : null,
  );

  // The comparison shown is driven by the route (/history/compare/<from>/<to>),
  // so it is shareable and the result is cached server-side.
  const ready = from != null && to != null && from > 0 && from < to;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["history-compare", from, to],
    // `enabled: ready` already gates this on both being present; the guard just
    // narrows the types (avoiding a non-null assertion).
    queryFn: () =>
      from != null && to != null
        ? getBuildRangeChanges(from, to)
        : Promise.resolve(null),
    enabled: ready,
    staleTime: Infinity,
  });

  const outOfOrder = !!fromSel && !!toSel && Number(fromSel) >= Number(toSel);
  const canCompare = !!fromSel && !!toSel && !outOfOrder;

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Compare builds</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Pick two builds to see how EVE Online static data changed between
            them.{" "}
            <Anchor component={Link} href="/history" size="sm">
              All history
            </Anchor>
          </Text>
        </div>

        <Group align="flex-end" gap="sm">
          <Select
            label="From build"
            placeholder="older build"
            searchable
            data={options}
            value={fromSel}
            onChange={setFromSel}
            nothingFoundMessage="No matching build"
            w={230}
          />
          <Select
            label="To build"
            placeholder="newer build"
            searchable
            data={options}
            value={toSel}
            onChange={setToSel}
            nothingFoundMessage="No matching build"
            w={230}
          />
          <Button
            onClick={() =>
              canCompare && router.push(`/history/compare/${fromSel}/${toSel}`)
            }
            disabled={!canCompare}
          >
            Compare
          </Button>
        </Group>
        {outOfOrder && (
          <Text size="xs" c="red">
            The from build must be older (lower number) than the to build.
          </Text>
        )}

        {ready && isLoading && <Loader />}
        {ready && isError && (
          <Alert color="red">Could not load the comparison. Try again.</Alert>
        )}
        {ready && !isLoading && data === null && (
          <Alert color="gray">
            One of those builds is not in the tracked history.
          </Alert>
        )}
        {ready && data && <CompareResults data={data} />}
      </Stack>
    </Container>
  );
}
