"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Spoiler,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getFileDiff, getStringChanges } from "~/lib/history-actions";
import type { Counts, StringChange } from "~/lib/resource-history";
import { LANGUAGE_LABEL } from "~/lib/resource-history";

const SPOILER_MAX_HEIGHT = 520;

const total = (c: Counts) => c.added + c.changed + c.removed;

function PathList({
  title,
  color,
  paths,
}: {
  title: string;
  color: string;
  paths: string[];
}) {
  if (paths.length === 0) return null;
  return (
    <div>
      <Group gap="xs" mb={2}>
        <Text size="xs" fw={600}>
          {title}
        </Text>
        <Badge size="xs" variant="light" color={color}>
          {paths.length.toLocaleString()}
        </Badge>
      </Group>
      <Spoiler
        maxHeight={SPOILER_MAX_HEIGHT}
        showLabel={`Show all ${paths.length.toLocaleString()}`}
        hideLabel="Show less"
        fz="xs"
      >
        <Stack gap={0}>
          {paths.map((p) => (
            <Text key={p} size="xs" ff="monospace" c="dimmed">
              {p}
            </Text>
          ))}
        </Stack>
      </Spoiler>
    </div>
  );
}

function FileChanges({ build, counts }: { build: number; counts: Counts }) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ["res-files", build],
    queryFn: () => getFileDiff(build),
    enabled: open,
    staleTime: Infinity,
  });
  return (
    <div>
      <Group gap="xs">
        <Button
          variant="subtle"
          size="compact-xs"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "▾" : "▸"} Files
        </Button>
        <Text size="sm">
          <Text span c="green">
            +{counts.added.toLocaleString()}
          </Text>{" "}
          new ·{" "}
          <Text span c="blue">
            {counts.changed.toLocaleString()}
          </Text>{" "}
          changed ·{" "}
          <Text span c="red">
            −{counts.removed.toLocaleString()}
          </Text>{" "}
          removed
        </Text>
      </Group>
      {open && (
        <Stack gap="xs" mt="xs" pl="md">
          {!data && isFetching ? (
            <Loader size="xs" />
          ) : data ? (
            <>
              <PathList title="New" color="green" paths={data.added} />
              <PathList title="Changed" color="blue" paths={data.changed} />
              <PathList title="Removed" color="red" paths={data.removed} />
            </>
          ) : (
            <Text size="xs" c="dimmed">
              No file list recorded.
            </Text>
          )}
        </Stack>
      )}
    </div>
  );
}

function StringList({ changes }: { changes: StringChange[] }) {
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      showLabel={`Show all ${changes.length.toLocaleString()}`}
      hideLabel="Show less"
      fz="xs"
    >
      <Stack gap={1}>
        {changes.map((c) => {
          const color =
            c.kind === "added"
              ? "green"
              : c.kind === "removed"
                ? "red"
                : undefined;
          return (
            <Group
              gap={4}
              key={`${c.kind}-${c.id}`}
              align="baseline"
              wrap="nowrap"
            >
              <Text size="xs" c={color}>
                {c.kind === "added" ? "+" : c.kind === "removed" ? "−" : "~"}
              </Text>
              <Text size="xs" c="dimmed">
                #{c.id}
              </Text>
              {c.kind === "changed" ? (
                <Text size="xs">
                  <Text span c="red" style={{ textDecoration: "line-through" }}>
                    {c.from}
                  </Text>{" "}
                  →{" "}
                  <Text span c="green">
                    {c.to}
                  </Text>
                </Text>
              ) : (
                <Text
                  size="xs"
                  c={color}
                  style={
                    c.kind === "removed"
                      ? { textDecoration: "line-through" }
                      : undefined
                  }
                >
                  {c.from ?? c.to}
                </Text>
              )}
            </Group>
          );
        })}
      </Stack>
    </Spoiler>
  );
}

function StringLang({
  build,
  lang,
  counts,
}: {
  build: number;
  lang: string;
  counts: Counts;
}) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ["res-strings", build, lang],
    queryFn: () => getStringChanges(build, lang),
    enabled: open,
    staleTime: Infinity,
  });
  return (
    <div>
      <Group gap="xs">
        <Button
          variant="subtle"
          size="compact-xs"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "▾" : "▸"} {LANGUAGE_LABEL[lang] ?? lang}
        </Button>
        <Text size="xs" c="dimmed">
          +{counts.added.toLocaleString()} · {counts.changed.toLocaleString()}{" "}
          changed · −{counts.removed.toLocaleString()}
        </Text>
      </Group>
      {open && (
        <div style={{ paddingLeft: "var(--mantine-spacing-md)" }}>
          {!data && isFetching ? (
            <Loader size="xs" />
          ) : data ? (
            <StringList changes={data} />
          ) : (
            <Text size="xs" c="dimmed">
              No changes.
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

/** Raw resource-file + localization-string changes for a build. */
export function ResourceChanges({
  build,
  files,
  strings,
}: {
  build: number;
  files: Counts;
  strings: Record<string, Counts>;
}) {
  const langs = Object.entries(strings)
    .filter(([, c]) => total(c) > 0)
    .sort(([a], [b]) =>
      a === "en-us" ? -1 : b === "en-us" ? 1 : a.localeCompare(b),
    );
  if (total(files) === 0 && langs.length === 0) return null;
  return (
    <Paper withBorder p="lg" radius="md">
      <Title order={4} mb="sm">
        Resources
      </Title>
      <Stack gap="sm">
        {total(files) > 0 && <FileChanges build={build} counts={files} />}
        {langs.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Localization strings
            </Text>
            <Stack gap={2}>
              {langs.map(([lang, c]) => (
                <StringLang key={lang} build={build} lang={lang} counts={c} />
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
