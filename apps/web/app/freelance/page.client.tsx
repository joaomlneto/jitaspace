"use client";

import { useMemo } from "react";
import {
  Alert,
  Button,
  Container,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";

import { useFreelanceJobs } from "@jitaspace/hooks";

import {
  formatCompact,
  formatIsk,
  formatWhole,
  FreelanceHeader,
  FreelanceJobsTable,
} from "~/components/Freelance";

function Stat({
  label,
  value,
  title,
}: Readonly<{ label: string; value?: string; title?: string }>) {
  return (
    <Paper withBorder p="sm" radius="md" role="group" aria-label={label}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} aria-hidden>
        {label}
      </Text>
      {/* The skeleton holds the value's height, so the figures landing do not
          push the table down. */}
      <Skeleton visible={value === undefined} mt={4}>
        <Text fz="xl" fw={700} title={title}>
          {value ?? "0"}
        </Text>
      </Skeleton>
    </Paper>
  );
}

export default function FreelanceBoardPage() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useFreelanceJobs();

  const jobs = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    if (!data) return undefined;
    let remaining = 0;
    let participants = 0;
    for (const job of data) {
      remaining += job.reward?.remaining ?? 0;
      participants += job.progress.current > 0 ? 1 : 0;
    }
    return { remaining, started: participants };
  }, [data]);

  return (
    <Container size="xl">
      <Stack>
        <FreelanceHeader
          current="board"
          title="Freelance Jobs"
          description="Every freelance job open to the public right now. Capsuleers post them to pay others for hauling, mining, combat and more; open a job to see exactly what it asks for and where."
        />

        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          <Stat
            label="Active jobs"
            value={totals && formatWhole(jobs.length)}
          />
          <Stat
            label="ISK left to earn"
            value={totals && `${formatCompact(totals.remaining)} ISK`}
            title={totals && formatIsk(totals.remaining)}
          />
          <Stat
            label="Jobs under way"
            value={totals && formatWhole(totals.started)}
          />
        </SimpleGrid>

        {isError && (
          <Alert
            color="red"
            title="The job board could not be loaded"
            role="alert"
          >
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{error.message}</Text>
              <Button
                size="xs"
                variant="light"
                color="red"
                loading={isRefetching}
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </Stack>
          </Alert>
        )}

        <FreelanceJobsTable
          jobs={jobs}
          isLoading={isPending}
          emptyText={
            isError
              ? "No jobs to show"
              : "There are no public freelance jobs right now"
          }
        />
      </Stack>
    </Container>
  );
}
