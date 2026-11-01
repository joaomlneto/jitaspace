"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { parseAsInteger, useQueryState } from "nuqs";

import type { FreelanceJobDetails } from "@jitaspace/hooks";
import { EveEntityName } from "@jitaspace/eve-components";
import {
  CORPORATION_FREELANCE_JOBS_SCOPE,
  FREELANCE_JOB_MANAGER_ROLES,
  useAuthenticatedCharacterIds,
  useAuthStoreHasHydrated,
  useCharactersFreelanceJobParticipation,
  useCharactersFreelanceJobs,
  useCorporationFreelanceJobParticipants,
  useEsiSubjects,
  useFreelanceJob,
} from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CorporationAvatar,
  FormattedDateText,
  TimeAgoText,
} from "@jitaspace/ui";

import {
  CharacterAnchor,
  CorporationAnchor,
  SolarSystemAnchor,
} from "~/components/Anchor";
import { MailMessageViewer } from "~/components/EveMail";
import {
  contributionMethodLabel,
  Fact,
  formatIsk,
  formatWhole,
  FreelanceCareerBadge,
  FreelanceJobParticipantsTable,
  FreelanceJobProgress,
  FreelanceJobRequirements,
  freelanceJobRewardPaid,
  FreelanceJobStateBadge,
  FreelanceParticipantStateBadge,
  IskText,
} from "~/components/Freelance";
import { HoverPrefetchLink } from "~/components/Link";

function Section({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Paper withBorder p="md" radius="md" component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}

function DateFact({ label, date }: Readonly<{ label: string; date?: string }>) {
  if (!date) return null;
  const value = new Date(date);
  return (
    <Fact label={label}>
      <FormattedDateText size="sm" date={value} format="yyyy-MM-dd HH:mm" />
      <TimeAgoText
        size="xs"
        c="dimmed"
        date={value}
        addSuffix
        updateInterval={60_000}
      />
    </Fact>
  );
}

function JobSkeleton() {
  return (
    <Stack aria-busy="true" aria-label="Loading freelance job">
      <Skeleton height={36} width="60%" />
      <Skeleton height={24} width={240} />
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack>
            <Skeleton height={120} radius="md" />
            <Skeleton height={200} radius="md" />
          </Stack>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Skeleton height={320} radius="md" />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

/**
 * Why a job could not be read, and what to do about it. A job behind an ACL
 * fails for anyone outside it, so a failed anonymous read offers to try again
 * as each logged-in character.
 */
function JobError({
  status,
  viewer,
  characterIds,
  onViewAs,
}: Readonly<{
  status?: number;
  viewer?: number;
  characterIds: number[];
  onViewAs: (characterId: number | null) => void;
}>) {
  const denied = status === 401 || status === 403 || status === 404;
  if (!denied) {
    return (
      <Alert color="red" title="This job could not be loaded" role="alert">
        ESI did not answer. Try again in a moment.
      </Alert>
    );
  }
  const others = characterIds.filter((id) => id !== viewer);
  return (
    <Alert color="yellow" title="Job not found" role="alert">
      <Stack gap="xs" align="flex-start">
        <Text size="sm">
          {viewer === undefined
            ? "No public job has this id. A private job is visible only to its participants and the managers of the corporation that posted it."
            : "This job does not exist, or this character cannot see it."}
        </Text>
        {others.length > 0 && (
          <Group gap="xs">
            <Text size="sm">View as:</Text>
            {others.map((characterId) => (
              <Button
                key={characterId}
                size="xs"
                variant="light"
                leftSection={
                  <CharacterAvatar characterId={characterId} size={18} />
                }
                onClick={() => onViewAs(characterId)}
              >
                <EveEntityName
                  span
                  entityId={characterId}
                  category="character"
                />
              </Button>
            ))}
          </Group>
        )}
        {viewer !== undefined && (
          <Button size="xs" variant="subtle" onClick={() => onViewAs(null)}>
            View the public listing instead
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

function ParticipationSection({
  jobId,
  job,
}: Readonly<{ jobId: string; job: FreelanceJobDetails }>) {
  // Only characters whose listing holds the job are asked: ESI answers 404
  // for the others, and counts each one against the error limit.
  const listings = useCharactersFreelanceJobs();
  const participantIds = useMemo(
    () => [
      ...new Set(
        listings.data
          .filter((listed) => listed.id === jobId)
          .map((listed) => listed.subjectId),
      ),
    ],
    [listings.data, jobId],
  );
  const participation = useCharactersFreelanceJobParticipation(
    jobId,
    participantIds,
  );

  if (participantIds.length === 0) return null;

  return (
    <Section title="Your participation">
      <Stack gap="xs">
        {participantIds.map((characterId) => {
          const entry = participation.data.find(
            (value) => value.subjectId === characterId,
          );
          return (
            <Group key={characterId} justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <CharacterAvatar characterId={characterId} size="sm" />
                <CharacterAnchor characterId={characterId} size="sm">
                  <EveEntityName
                    span
                    entityId={characterId}
                    category="character"
                  />
                </CharacterAnchor>
              </Group>
              {entry ? (
                <Group gap="sm" wrap="nowrap">
                  <FreelanceParticipantStateBadge state={entry.data.state} />
                  <Text
                    size="sm"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatWhole(entry.data.contributed)} contributed
                    {job.progress.current > 0 &&
                      ` (${((entry.data.contributed / job.progress.current) * 100).toFixed(1)}%)`}
                  </Text>
                </Group>
              ) : (
                <Skeleton height={20} width={160} />
              )}
            </Group>
          );
        })}
      </Stack>
    </Section>
  );
}

function ParticipantsSection({
  jobId,
  job,
}: Readonly<{ jobId: string; job: FreelanceJobDetails }>) {
  const corporationId = job.details.creator.corporation.id;
  const participants = useCorporationFreelanceJobParticipants(
    corporationId,
    jobId,
  );
  return (
    <Section title="Participants">
      {participants.isError ? (
        <Text size="sm" c="red">
          The participants could not be loaded: {participants.error.message}
        </Text>
      ) : (
        <FreelanceJobParticipantsTable
          participants={participants.data}
          total={job.progress.current}
          isLoading={participants.isPending}
        />
      )}
    </Section>
  );
}

function JobDetails({
  jobId,
  job,
  managesJob,
}: Readonly<{ jobId: string; job: FreelanceJobDetails; managesJob: boolean }>) {
  const { details, contribution, access_and_visibility: access } = job;
  const paid = freelanceJobRewardPaid(job);
  const broadcast = access.broadcast_locations ?? [];
  const restrictions = access.restrictions;

  return (
    <Stack>
      <Stack gap="xs">
        <Title order={1}>{job.name || "Unnamed job"}</Title>
        <Group gap="xs">
          <FreelanceJobStateBadge state={job.state} />
          <FreelanceCareerBadge career={details.career} />
          <Badge variant="outline" size="lg" radius="sm">
            {contributionMethodLabel(job.configuration.method)}
          </Badge>
          {access.acl_protected && (
            <Badge color="grape" variant="light" size="lg" radius="sm">
              Private
            </Badge>
          )}
        </Group>
      </Stack>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack>
            <Section title="Progress">
              <FreelanceJobProgress job={job} size="lg" />
              {job.reward && (
                <Group grow gap="md" align="flex-start">
                  <div>
                    <Text size="xs" c="dimmed">
                      Left to earn
                    </Text>
                    <IskText amount={job.reward.remaining} size="md" />
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Paid out
                    </Text>
                    <IskText amount={paid} size="md" />
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Total reward
                    </Text>
                    <IskText amount={job.reward.initial} size="md" />
                  </div>
                </Group>
              )}
            </Section>

            {details.description.trim() !== "" && (
              <Section title="Description">
                <MailMessageViewer content={details.description} />
              </Section>
            )}

            <Section title="What to do">
              <Text size="sm">
                {contributionMethodLabel(job.configuration.method)}
              </Text>
              <FreelanceJobRequirements configuration={job.configuration} />
            </Section>

            <ParticipationSection jobId={jobId} job={job} />
            {managesJob && <ParticipantsSection jobId={jobId} job={job} />}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <Section title="Posted by">
              <Group gap="xs" wrap="nowrap">
                <CharacterAvatar
                  characterId={details.creator.character.id}
                  size="md"
                />
                {/* Spaced so the two links clear the 24px touch-target
                    minimum (WCAG 2.5.8). */}
                <Stack gap={6} style={{ minWidth: 0 }}>
                  <CharacterAnchor
                    characterId={details.creator.character.id}
                    size="sm"
                  >
                    {details.creator.character.name}
                  </CharacterAnchor>
                  <Group gap={4} wrap="nowrap">
                    <CorporationAvatar
                      corporationId={details.creator.corporation.id}
                      size={16}
                    />
                    <CorporationAnchor
                      corporationId={details.creator.corporation.id}
                      size="sm"
                    >
                      {details.creator.corporation.name}
                    </CorporationAnchor>
                  </Group>
                </Stack>
              </Group>
            </Section>

            <Section title="Dates">
              <Stack gap="xs">
                <DateFact label="Posted" date={details.created} />
                <DateFact label="Expires" date={details.expires} />
                <DateFact label="Finished" date={details.finished} />
                <DateFact label="Last updated" date={job.last_modified} />
              </Stack>
            </Section>

            {contribution && (
              <Section title="Rules">
                <Stack gap="xs">
                  {contribution.reward_per_contribution !== undefined && (
                    <Fact label="Reward per unit">
                      <Text size="sm">
                        {formatIsk(contribution.reward_per_contribution)}
                      </Text>
                    </Fact>
                  )}
                  {contribution.submission_multiplier !== undefined && (
                    <Fact label="Progress per unit">
                      <Text size="sm">
                        ×{contribution.submission_multiplier}
                      </Text>
                    </Fact>
                  )}
                  {contribution.contribution_per_participant_limit !==
                    undefined && (
                    <Fact label="Limit per participant">
                      <Text size="sm">
                        {formatWhole(
                          contribution.contribution_per_participant_limit,
                        )}
                      </Text>
                    </Fact>
                  )}
                  {contribution.submission_limit !== undefined && (
                    <Fact label="Limit per submission">
                      <Text size="sm">
                        {formatWhole(contribution.submission_limit)}
                      </Text>
                    </Fact>
                  )}
                  <Fact label="Participants allowed">
                    <Text size="sm">
                      {formatWhole(contribution.max_committed_participants)}
                    </Text>
                  </Fact>
                </Stack>
              </Section>
            )}

            <Section title="Who can join">
              <Stack gap="xs">
                <Fact label="Access">
                  <Text size="sm">
                    {access.acl_protected ? "Access list only" : "Anyone"}
                  </Text>
                </Fact>
                {restrictions?.minimum_age !== undefined && (
                  <Fact label="Minimum character age">
                    <Text size="sm">
                      {formatWhole(restrictions.minimum_age)} days
                    </Text>
                  </Fact>
                )}
                {restrictions?.maximum_age !== undefined && (
                  <Fact label="Maximum character age">
                    <Text size="sm">
                      {formatWhole(restrictions.maximum_age)} days
                    </Text>
                  </Fact>
                )}
                <div>
                  <Text size="sm" c="dimmed">
                    Advertised in
                  </Text>
                  {broadcast.length === 0 ? (
                    <Text size="sm" fs="italic" c="dimmed">
                      Not advertised in any system
                    </Text>
                  ) : (
                    <Group gap="sm" mt={4}>
                      {broadcast.map((system) => (
                        <SolarSystemAnchor
                          key={system.id}
                          solarSystemId={system.id}
                          size="sm"
                        >
                          {system.name}
                        </SolarSystemAnchor>
                      ))}
                    </Group>
                  )}
                </div>
              </Stack>
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

/**
 * The character whose token reads the job, from `?as=`: how a private job
 * opens from "Your jobs". Until the auth store has rehydrated the id is kept
 * (the token appears shortly); after, a character not logged in here is
 * dropped and the job is read anonymously.
 */
function jobViewer(
  as: number | null,
  hydrated: boolean,
  characterIds: readonly number[],
): number | undefined {
  if (as === null || as <= 0) return undefined;
  if (hydrated && !characterIds.includes(as)) return undefined;
  return as;
}

export default function FreelanceJobPage({
  jobId,
}: Readonly<{ jobId: string }>) {
  const hydrated = useAuthStoreHasHydrated();
  const characterIds = useAuthenticatedCharacterIds();
  const [as, setAs] = useQueryState("as", parseAsInteger);
  const viewer = jobViewer(as, hydrated, characterIds);

  const { data: job, error } = useFreelanceJob(jobId, {
    characterId: viewer,
  });

  const managedCorporations = useEsiSubjects({
    kind: "corporation",
    scopes: [CORPORATION_FREELANCE_JOBS_SCOPE],
    roles: FREELANCE_JOB_MANAGER_ROLES,
  });
  const managesJob =
    job !== undefined &&
    managedCorporations.some(
      (subject) => subject.id === job.details.creator.corporation.id,
    );

  let content: ReactNode;
  if (job) {
    content = <JobDetails jobId={jobId} job={job} managesJob={managesJob} />;
  } else if (error) {
    content = (
      <JobError
        status={error.response?.status}
        viewer={viewer}
        characterIds={characterIds}
        onViewAs={(characterId) => void setAs(characterId)}
      />
    );
  } else {
    // Also while a `?as=` character's token is still on its way.
    content = <JobSkeleton />;
  }

  return (
    <Container size="lg">
      <Stack>
        <Anchor
          component={HoverPrefetchLink}
          href="/freelance"
          size="sm"
          w="fit-content"
        >
          <Group gap={4} component="span">
            <IconArrowLeft size={14} aria-hidden />
            Freelance jobs
          </Group>
        </Anchor>

        {content}
      </Stack>
    </Container>
  );
}
