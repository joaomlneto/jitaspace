"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Chip,
  Container,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { parseAsArrayOf, parseAsStringLiteral, useQueryState } from "nuqs";

import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";

import type {
  HistoryServer,
  StringEvent,
  StringHistory,
} from "~/lib/resource-pages";
import { MailMessageViewer } from "~/components/EveMail";
import { TextDiff } from "~/components/History";
import { LANGUAGE_LABEL } from "~/lib/resource-history";
import { compareLanguages } from "~/lib/resource-pages";

export const SERVER_FILTERS = ["tranquility", "singularity", "all"] as const;
export type ServerFilter = (typeof SERVER_FILTERS)[number];

const SERVER_LABEL: Record<ServerFilter, string> = {
  tranquility: "Tranquility",
  singularity: "Singularity",
  all: "All servers",
};

const OP_COLOR = { added: "green", changed: "blue", removed: "red" } as const;

const languageLabel = (lang: string) => LANGUAGE_LABEL[lang] ?? lang;

/**
 * Whether a build passes the server filter. SDE-era builds (no server) count
 * as Tranquility's: they are what the live server shipped.
 */
export function matchesServer(
  server: HistoryServer,
  filter: ServerFilter,
): boolean {
  if (filter === "all") return true;
  return (server ?? "tranquility") === filter;
}

/** The latest event per language, i.e. each language's current state. */
export function latestByLanguage(
  events: readonly StringEvent[],
): Map<string, StringEvent> {
  const latest = new Map<string, StringEvent>();
  for (const event of events) {
    const current = latest.get(event.lang);
    if (!current || event.build >= current.build) latest.set(event.lang, event);
  }
  return latest;
}

/** Events grouped by build, newest build first. */
export function groupByBuild(events: readonly StringEvent[]): {
  build: number;
  date: string | null;
  server: HistoryServer;
  events: StringEvent[];
}[] {
  const groups = new Map<number, StringEvent[]>();
  for (const event of events) {
    const group = groups.get(event.build);
    if (group) group.push(event);
    else groups.set(event.build, [event]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([build, group]) => ({
      build,
      date: group[0]?.date ?? null,
      server: group[0]?.server ?? null,
      events: group.toSorted((a, b) => compareLanguages(a.lang, b.lang)),
    }));
}

function BuildLink({
  build,
  server,
}: Readonly<{ build: number; server: HistoryServer }>) {
  // The build pages cover Tranquility (and SDE) builds only.
  if (server === "singularity") return <Text fw={600}>Build {build}</Text>;
  return (
    <Anchor component={Link} href={`/history/build/${build}`} fw={600}>
      Build {build}
    </Anchor>
  );
}

function CurrentText({ event }: Readonly<{ event: StringEvent }>) {
  const [raw, setRaw] = useState(false);
  const removed = event.op === "removed";
  const text = (removed ? event.from : event.to) ?? "";
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
        <Group gap="xs">
          <Text fw={600}>{languageLabel(event.lang)}</Text>
          <Text size="xs" c="dimmed">
            as of <BuildLink build={event.build} server={event.server} />
          </Text>
          {removed && (
            <Badge size="xs" color="red" variant="light">
              Removed
            </Badge>
          )}
        </Group>
        <Switch
          size="xs"
          label="Markup"
          checked={raw}
          onChange={(e) => setRaw(e.currentTarget.checked)}
        />
      </Group>
      {raw ? (
        <Text
          size="sm"
          ff="monospace"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          td={removed ? "line-through" : undefined}
        >
          {text}
        </Text>
      ) : (
        <div style={removed ? { opacity: 0.6 } : undefined}>
          <MailMessageViewer content={sanitizeFormattedEveString(text)} />
        </div>
      )}
    </Paper>
  );
}

export default function StringHistoryPage({
  history,
}: Readonly<{ history: StringHistory }>) {
  const { languages, events } = history;
  const defaultLanguages = languages.includes("en-us")
    ? ["en-us"]
    : languages.slice(0, 1);

  // Filters live in the URL so a filtered view can be shared.
  const [selected, setSelected] = useQueryState(
    "lang",
    parseAsArrayOf(parseAsStringLiteral(languages))
      .withDefault(defaultLanguages)
      .withOptions({ history: "replace" }),
  );
  const [server, setServer] = useQueryState(
    "server",
    parseAsStringLiteral(SERVER_FILTERS)
      .withDefault("tranquility")
      .withOptions({ history: "replace" }),
  );

  const filtered = useMemo(
    () =>
      events.filter(
        (e) => selected.includes(e.lang) && matchesServer(e.server, server),
      ),
    [events, selected, server],
  );
  const current = useMemo(
    () =>
      [...latestByLanguage(filtered).values()].sort((a, b) =>
        compareLanguages(a.lang, b.lang),
      ),
    [filtered],
  );
  const timeline = useMemo(() => groupByBuild(filtered), [filtered]);

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2}>String {history.stringId}</Title>
          <Text c="dimmed" size="sm">
            A localization string of the EVE client, and how its text changed
            from build to build in each language.
          </Text>
        </div>

        <Stack gap="xs">
          <Chip.Group
            multiple
            value={selected}
            onChange={(value) =>
              void setSelected(value.filter((lang) => languages.includes(lang)))
            }
          >
            <Group gap={6} aria-label="Languages">
              {languages.map((lang) => (
                <Chip key={lang} value={lang} size="xs">
                  {languageLabel(lang)}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          <SegmentedControl
            size="xs"
            aria-label="Server"
            value={server}
            onChange={(value) => void setServer(value)}
            data={SERVER_FILTERS.map((value) => ({
              value,
              label: SERVER_LABEL[value],
            }))}
            style={{ alignSelf: "flex-start" }}
          />
        </Stack>

        {filtered.length === 0 ? (
          <Text c="dimmed" size="sm">
            No changes recorded for the selected languages on{" "}
            {SERVER_LABEL[server].toLowerCase()}.
          </Text>
        ) : (
          <>
            <Stack gap="sm">
              <Title order={4}>Current text</Title>
              {current.map((event) => (
                <CurrentText key={event.lang} event={event} />
              ))}
            </Stack>

            <Stack gap="sm">
              <Title order={4}>History</Title>
              {timeline.map((group) => (
                <Paper key={group.build} withBorder radius="md" p="md">
                  <Group gap="xs" mb="sm">
                    <BuildLink build={group.build} server={group.server} />
                    {group.date && (
                      <Text size="sm" c="dimmed">
                        {group.date}
                      </Text>
                    )}
                    {group.server === "singularity" && (
                      <Badge size="xs" variant="outline" color="gray">
                        Singularity
                      </Badge>
                    )}
                  </Group>
                  <Stack gap="sm">
                    {group.events.map((event) => (
                      <Group
                        key={event.lang}
                        align="flex-start"
                        wrap="nowrap"
                        gap="sm"
                      >
                        <Stack gap={4} w={110} style={{ flexShrink: 0 }}>
                          <Text size="sm" fw={500}>
                            {languageLabel(event.lang)}
                          </Text>
                          <Badge
                            size="xs"
                            variant="light"
                            color={OP_COLOR[event.op]}
                          >
                            {event.op}
                          </Badge>
                        </Stack>
                        <TextDiff
                          from={event.from}
                          to={event.to}
                          lang={event.lang}
                          size="sm"
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
