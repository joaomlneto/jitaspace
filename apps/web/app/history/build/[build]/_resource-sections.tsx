"use client";

import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";

import type { FileDiff, StringChange } from "~/lib/resource-history";
import { LANGUAGE_LABEL } from "~/lib/resource-history";
import { RowSpoiler } from "./_row-spoiler";

const fileCount = (f: FileDiff) =>
  f.added.length + f.changed.length + f.removed.length;

const countKind = (changes: StringChange[], kind: StringChange["kind"]) =>
  changes.filter((c) => c.kind === kind).length;

/** Whether a build changed any resource file or localization string. */
export const hasResourceChanges = (
  files: FileDiff,
  strings: Record<string, StringChange[]>,
) =>
  fileCount(files) > 0 ||
  Object.values(strings).some((changes) => changes.length > 0);

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
      <RowSpoiler items={paths} fz="xs">
        {(visible) => (
          <Stack gap={0}>
            {visible.map((p) => (
              <Text key={p} size="xs" ff="monospace" c="dimmed">
                {p}
              </Text>
            ))}
          </Stack>
        )}
      </RowSpoiler>
    </div>
  );
}

function FileChanges({ files }: Readonly<{ files: FileDiff }>) {
  const [open, setOpen] = useState(false);
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
            +{files.added.length.toLocaleString()}
          </Text>{" "}
          new ·{" "}
          <Text span c="blue">
            {files.changed.length.toLocaleString()}
          </Text>{" "}
          changed ·{" "}
          <Text span c="red">
            −{files.removed.length.toLocaleString()}
          </Text>{" "}
          removed
        </Text>
      </Group>
      {open && (
        <Stack gap="xs" mt="xs" pl="md">
          <PathList title="New" color="green" paths={files.added} />
          <PathList title="Changed" color="blue" paths={files.changed} />
          <PathList title="Removed" color="red" paths={files.removed} />
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
    <RowSpoiler items={changes} fz="xs">
      {(visible) => (
        <Stack gap={1}>
          {visible.map((c) => {
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
                    <Text
                      span
                      c="red"
                      style={{ textDecoration: "line-through" }}
                    >
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
      )}
    </RowSpoiler>
  );
}

function StringLang({
  lang,
  changes,
}: Readonly<{
  lang: string;
  changes: StringChange[];
}>) {
  const [open, setOpen] = useState(false);
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
          +{countKind(changes, "added").toLocaleString()} ·{" "}
          {countKind(changes, "changed").toLocaleString()} changed · −
          {countKind(changes, "removed").toLocaleString()}
        </Text>
      </Group>
      {open && (
        <div style={{ paddingLeft: "var(--mantine-spacing-md)" }}>
          <StringList changes={changes} />
        </div>
      )}
    </div>
  );
}

/** Raw resource-file + localization-string changes for a build. */
export function ResourceChanges({
  files,
  strings,
}: Readonly<{
  files: FileDiff;
  strings: Record<string, StringChange[]>;
}>) {
  const langs = Object.entries(strings)
    .filter(([, changes]) => changes.length > 0)
    .sort(([a], [b]) => {
      if (a === "en-us") return -1;
      if (b === "en-us") return 1;
      return a.localeCompare(b);
    });
  if (!hasResourceChanges(files, strings)) return null;
  return (
    <Paper withBorder p="lg" radius="md">
      <Title order={4} mb="sm">
        Resources
      </Title>
      <Stack gap="sm">
        {fileCount(files) > 0 && <FileChanges files={files} />}
        {langs.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb={4}>
              Localization strings
            </Text>
            <Stack gap={2}>
              {langs.map(([lang, changes]) => (
                <StringLang key={lang} lang={lang} changes={changes} />
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
