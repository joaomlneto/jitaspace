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

import type { Counts, StringChange } from "~/lib/resource-history";
import { getFileDiff, getStringChanges } from "~/lib/history-actions";
import { LANGUAGE_LABEL } from "~/lib/resource-history";

const SPOILER_MAX_HEIGHT = 520;

const total = (c: Counts) => c.added + c.changed + c.removed;

function PathList({
  title,
  color,
  paths,
}: Readonly<{
  title: string;
  color: string;
  paths: string[];
}>) {
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

function resolveFileChangesContent(
  data:
    | { added: string[]; changed: string[]; removed: string[] }
    | null
    | undefined,
  isFetching: boolean,
) {
  if (!data && isFetching) {
    return <Loader size="xs" />;
  }
  if (data) {
    return (
      <>
        <PathList title="New" color="green" paths={data.added} />
        <PathList title="Changed" color="blue" paths={data.changed} />
        <PathList title="Removed" color="red" paths={data.removed} />
      </>
    );
  }
  return (
    <Text size="xs" c="dimmed">
      No file list recorded.
    </Text>
  );
}

function FileChanges({
  build,
  counts,
}: Readonly<{ build: number; counts: Counts }>) {
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
          {resolveFileChangesContent(data, isFetching)}
        </Stack>
      )}
    </div>
  );
}

function stringChangeColor(kind: StringChange["kind"]): string | undefined {
  if (kind === "added") return "green";
  if (kind === "removed") return "red";
  return undefined;
}

function stringChangePrefix(kind: StringChange["kind"]): string {
  if (kind === "added") return "+";
  if (kind === "removed") return "−";
  return "~";
}

function StringList({ changes }: Readonly<{ changes: StringChange[] }>) {
  return (
    <Spoiler
      maxHeight={SPOILER_MAX_HEIGHT}
      showLabel={`Show all ${changes.length.toLocaleString()}`}
      hideLabel="Show less"
      fz="xs"
    >
      <Stack gap={1}>
        {changes.map((c) => {
          const color = stringChangeColor(c.kind);
          return (
            <Group
              gap={4}
              key={`${c.kind}-${c.id}`}
              align="baseline"
              wrap="nowrap"
            >
              <Text size="xs" c={color}>
                {stringChangePrefix(c.kind)}
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

function resolveStringLangContent(
  data: StringChange[] | null | undefined,
  isFetching: boolean,
) {
  if (!data && isFetching) {
    return <Loader size="xs" />;
  }
  if (data) {
    return <StringList changes={data} />;
  }
  return (
    <Text size="xs" c="dimmed">
      No changes.
    </Text>
  );
}

function StringLang({
  build,
  lang,
  counts,
}: Readonly<{
  build: number;
  lang: string;
  counts: Counts;
}>) {
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
          {resolveStringLangContent(data, isFetching)}
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
}: Readonly<{
  build: number;
  files: Counts;
  strings: Record<string, Counts>;
}>) {
  const langs = Object.entries(strings)
    .filter(([, c]) => total(c) > 0)
    .sort(([a], [b]) => {
      if (a === "en-us") return -1;
      if (b === "en-us") return 1;
      return a.localeCompare(b);
    });
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
