"use client";

import { useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Chip,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { IconAlertTriangle } from "@tabler/icons-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import type { FreelanceJob } from "@jitaspace/hooks";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import {
  CORPORATION_FREELANCE_JOBS_SCOPE,
  FREELANCE_JOB_MANAGER_ROLES,
  useAuthenticatedCharacterIds,
  useCharactersFreelanceJobs,
  useCorporationsFreelanceJobs,
  useEsiSubjects,
} from "@jitaspace/hooks";

import type {
  FreelanceJobRow,
  FreelanceJobSource,
} from "~/components/Freelance";
import {
  activeFreelanceSourceKeys,
  FreelanceHeader,
  freelanceJobHref,
  freelanceJobSourceKey,
  FreelanceJobsTable,
  mergeFreelanceJobs,
  nextFreelanceSourceSelection,
} from "~/components/Freelance";
import { FREELANCE_SCOPES } from "~/config/apps";

/** One chip's height, so every state of the source bar takes the same room. */
const SOURCE_BAR_HEIGHT = 32;

const KIND_LABELS: Record<FreelanceJobSource["kind"], string> = {
  character: "Characters",
  corporation: "Corporations",
};

function requestFreelanceScopes() {
  openContextModal({
    modal: "login",
    title: "Login",
    size: "xl",
    innerProps: { scopes: FREELANCE_SCOPES },
  });
}

/**
 * Sign-in prompt, access prompt or source chips, in one row whose height does
 * not change between them. The prerender cannot know who is signed in, so
 * anything that appeared above the table once the session loads would push it
 * down (Lighthouse measured 0.22 CLS when the chips were stacked alerts and
 * rows). The chips scroll sideways rather than wrap, for the same reason.
 */
function SourceBar({
  status,
  sources,
  activeKeys,
  failedKeys,
  onChange,
}: Readonly<{
  status: "loading" | "signed-out" | "no-access" | "ready";
  sources: FreelanceJobSource[];
  activeKeys: ReadonlySet<string>;
  failedKeys: ReadonlySet<string>;
  onChange: (value: string[]) => void;
}>) {
  if (status === "loading") {
    return (
      <Group mih={SOURCE_BAR_HEIGHT}>
        <Text size="sm" c="dimmed">
          Loading your characters…
        </Text>
      </Group>
    );
  }
  if (status === "signed-out" || status === "no-access") {
    return (
      <Group mih={SOURCE_BAR_HEIGHT} gap="sm" wrap="nowrap">
        <Text size="sm">
          {status === "signed-out"
            ? "Sign in with EVE Online to see your characters' and corporations' jobs."
            : "None of your characters have granted access to their freelance jobs."}
        </Text>
        <Button
          size="compact-sm"
          variant={status === "signed-out" ? "filled" : "light"}
          onClick={requestFreelanceScopes}
          style={{ flexShrink: 0 }}
        >
          {status === "signed-out" ? "Sign in" : "Grant access"}
        </Button>
      </Group>
    );
  }
  if (sources.length === 1) {
    const [source] = sources as [FreelanceJobSource];
    return (
      <Group mih={SOURCE_BAR_HEIGHT} gap={6} wrap="nowrap">
        <Text size="sm" c="dimmed">
          Jobs of
        </Text>
        <EveEntityAvatar
          entityId={source.subjectId}
          category={source.kind}
          size={20}
        />
        <EveEntityName
          span
          size="sm"
          entityId={source.subjectId}
          category={source.kind}
        />
      </Group>
    );
  }
  return (
    <Chip.Group multiple value={[...activeKeys]} onChange={onChange}>
      <ScrollArea type="auto" scrollbarSize={6} offsetScrollbars="x">
        <Group
          gap="xs"
          wrap="nowrap"
          mih={SOURCE_BAR_HEIGHT}
          role="group"
          aria-label="Show jobs from"
        >
          {(["character", "corporation"] as const).map((kind) => {
            const ofKind = sources.filter((source) => source.kind === kind);
            if (ofKind.length === 0) return null;
            return (
              <Group key={kind} gap="xs" wrap="nowrap">
                <Text size="sm" c="dimmed">
                  {KIND_LABELS[kind]}
                </Text>
                {ofKind.map((source) => {
                  const key = freelanceJobSourceKey(source);
                  const failed = failedKeys.has(key);
                  return (
                    <Chip
                      key={key}
                      value={key}
                      size="sm"
                      // Filled chips are 4.0:1 on the red themes.
                      variant="light"
                      color={failed ? "orange" : undefined}
                      icon={
                        failed ? (
                          <IconAlertTriangle size={14} aria-hidden />
                        ) : undefined
                      }
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
                        {failed && (
                          <VisuallyHidden>(could not be loaded)</VisuallyHidden>
                        )}
                      </Group>
                    </Chip>
                  );
                })}
              </Group>
            );
          })}
        </Group>
      </ScrollArea>
    </Chip.Group>
  );
}

/** Group a multi-subject hook's tagged rows back into one list per subject. */
function jobsBySubject(
  rows: readonly (FreelanceJob & { subjectId: number })[],
) {
  const bySubject = new Map<number, FreelanceJob[]>();
  for (const { subjectId, ...job } of rows) {
    const jobs = bySubject.get(subjectId) ?? [];
    jobs.push(job);
    bySubject.set(subjectId, jobs);
  }
  return bySubject;
}

export default function FreelanceMinePage() {
  const characterIds = useAuthenticatedCharacterIds();
  const characters = useCharactersFreelanceJobs();
  const corporations = useCorporationsFreelanceJobs();

  // Which character's token reads each corporation's jobs, so a link from a
  // corporation's row opens the job as that manager — the only way to see a
  // job behind an ACL.
  const managedCorporations = useEsiSubjects({
    kind: "corporation",
    scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
    roles: FREELANCE_JOB_MANAGER_ROLES,
  });

  const sources = useMemo<FreelanceJobSource[]>(
    () => [
      ...characters.subjectIds.map((subjectId) => ({
        kind: "character" as const,
        subjectId,
      })),
      ...corporations.subjectIds.map((subjectId) => ({
        kind: "corporation" as const,
        subjectId,
      })),
    ],
    [characters.subjectIds, corporations.subjectIds],
  );

  // `null` (no param) means every source; an explicit empty list is a real
  // choice and stays empty. Same convention as /contacts.
  const [selectedKeys, setSelectedKeys] = useQueryState(
    "sources",
    parseAsArrayOf(parseAsString),
  );
  const activeKeys = useMemo(
    () => activeFreelanceSourceKeys(selectedKeys, sources),
    [selectedKeys, sources],
  );

  const rows = useMemo<FreelanceJobRow[]>(() => {
    const characterJobs = jobsBySubject(characters.data);
    const corporationJobs = jobsBySubject(corporations.data);
    return mergeFreelanceJobs(
      sources
        .filter((source) => activeKeys.has(freelanceJobSourceKey(source)))
        .map((source) => ({
          source,
          jobs:
            (source.kind === "character"
              ? characterJobs.get(source.subjectId)
              : corporationJobs.get(source.subjectId)) ?? [],
        })),
    );
  }, [characters.data, corporations.data, sources, activeKeys]);

  const managerOf = useMemo(
    () =>
      new Map(
        managedCorporations.map((subject) => [subject.id, subject.characterId]),
      ),
    [managedCorporations],
  );
  const jobHref = useCallback(
    (job: FreelanceJob & { sources?: FreelanceJobSource[] }) => {
      const source = job.sources?.[0];
      const viewer =
        source?.kind === "character"
          ? source.subjectId
          : source && managerOf.get(source.subjectId);
      return viewer === undefined
        ? freelanceJobHref(job)
        : `${freelanceJobHref(job)}?as=${viewer}`;
    },
    [managerOf],
  );

  const isPending = characters.isPending || corporations.isPending;
  const pendingKeys = new Set([
    ...characters.pendingSubjectIds.map((subjectId) =>
      freelanceJobSourceKey({ kind: "character", subjectId }),
    ),
    ...corporations.pendingSubjectIds.map((subjectId) =>
      freelanceJobSourceKey({ kind: "corporation", subjectId }),
    ),
  ]);
  const isSelectionPending =
    sources.length === 0
      ? isPending
      : [...activeKeys].some((key) => pendingKeys.has(key));

  const errors = [
    ...characters.errors.map((error) => ({
      ...error,
      kind: "character" as const,
    })),
    ...corporations.errors.map((error) => ({
      ...error,
      kind: "corporation" as const,
    })),
  ];
  const failedKeys = new Set(
    errors.map((error) =>
      freelanceJobSourceKey({ kind: error.kind, subjectId: error.subjectId }),
    ),
  );

  const signedIn = characterIds.length > 0;

  return (
    <Container size="xl">
      <Stack>
        <FreelanceHeader
          current="mine"
          title="Your Freelance Jobs"
          description="Jobs your characters are taking part in, and every job your corporations have posted — finished ones and private ones included."
        />

        <SourceBar
          status={
            sources.length > 0
              ? "ready"
              : isPending
                ? "loading"
                : signedIn
                  ? "no-access"
                  : "signed-out"
          }
          sources={sources}
          activeKeys={activeKeys}
          failedKeys={failedKeys}
          onChange={(value) => {
            void setSelectedKeys(nextFreelanceSourceSelection(value, sources));
          }}
        />

        {(sources.length > 0 || isPending) && (
          <FreelanceJobsTable
            jobs={rows}
            showState
            showSources={sources.length > 1}
            jobHref={jobHref}
            isLoading={isSelectionPending && rows.length === 0}
            emptyText={
              sources.length > 1 && activeKeys.size === 0
                ? "No sources selected. Pick one above to see its jobs."
                : "No freelance jobs yet"
            }
          />
        )}

        {/* Below the table so it cannot push the rows down when it appears;
            the failing sources are also flagged on their chips above. */}
        {errors.length > 0 && (
          <Alert color="orange" title="Some jobs could not be loaded">
            <Stack gap={2}>
              {errors.map((error) => (
                <Text key={`${error.kind}:${error.subjectId}`} size="sm">
                  <EveEntityName span inherit entityId={error.subjectId} />
                  {": "}
                  {error.error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
