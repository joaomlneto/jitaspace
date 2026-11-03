"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBrandTwitch,
  IconExternalLink,
  IconMessages,
  IconSearch,
} from "@tabler/icons-react";

import type { CsmCandidate, CsmElection } from "~/config/csm";
import { CharacterCard } from "~/components/Card";
import { formatNewsDate } from "~/components/News";
import {
  CSM_21_RED,
  csmCandidateAnchor,
  FENRIS_CREATIONS_TWITCH,
} from "~/config/csm";
import classes from "./page.module.css";

interface CsmPageProps {
  election: CsmElection;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}

/** Lower-cases and strips accents, so "Ceema" matches "ceema" and "éve" "eve". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// The URL's `#fragment`, kept current. `:target` alone cannot highlight the
// card a badge linked to: Next's client-side navigation sets the hash with the
// History API, which never updates `:target`.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const getHash = () => window.location.hash;
const getServerHash = () => "";

function Hero({ election }: Readonly<CsmPageProps>) {
  return (
    <Box className={classes.hero}>
      <Box className={classes.heroScrim} />
      <Stack className={classes.heroContent} gap="md">
        <Image
          src="/wallpapers/2026-csm-21/csm-21-logo-white.webp"
          alt="CSM 21 — Council of Stellar Management"
          width={600}
          height={207}
          priority
          className={classes.heroLogo}
        />
        <Text c="gray.2" maw={560} className={classes.heroText}>
          Every year EVE Online&apos;s players elect a council to represent them
          before Fenris Creations. {election.candidates.length} capsuleers are
          standing for {election.name}: read their pitches, follow their
          campaigns and watch their interviews before casting your ballot.
        </Text>
        <Group gap="xl" className={classes.heroText}>
          <Stack gap={0}>
            <Text size="xs" c="gray.4" tt="uppercase" fw={700}>
              Campaign
            </Text>
            <Text c="white" fw={600}>
              6 – 21 October
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="gray.4" tt="uppercase" fw={700}>
              Voting
            </Text>
            <Text c="white" fw={600}>
              22 October – 3 November
            </Text>
          </Stack>
        </Group>
        <Group gap="xs">
          {election.voteUrl && (
            <Button
              component="a"
              href={election.voteUrl}
              target="_blank"
              rel="noopener noreferrer"
              color={CSM_21_RED}
              rightSection={<IconExternalLink size={14} />}
            >
              Vote now
            </Button>
          )}
          <Button
            component="a"
            href={election.announcement}
            target="_blank"
            rel="noopener noreferrer"
            color={CSM_21_RED}
            variant={election.voteUrl ? "white" : "filled"}
            rightSection={<IconExternalLink size={14} />}
          >
            Official announcement
          </Button>
          <Button
            component="a"
            href={election.forumCategory}
            target="_blank"
            rel="noopener noreferrer"
            variant="white"
            color="dark"
            leftSection={<IconMessages size={16} />}
          >
            Campaign threads
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}

function Interviews({ election }: Readonly<CsmPageProps>) {
  return (
    <Stack gap="sm">
      <Title order={3}>Candidate interviews</Title>
      <Text size="sm" c="dimmed">
        Fenris Creations interviewed the candidates live on{" "}
        <Anchor
          href={FENRIS_CREATIONS_TWITCH}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          FC TV
        </Anchor>{" "}
        on 17 and 18 October.
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        {election.interviews.map((interview) => (
          <Paper
            key={interview.url}
            component="a"
            href={interview.url}
            target="_blank"
            rel="noopener noreferrer"
            withBorder
            p="md"
            className={classes.interview}
          >
            <Group gap="sm" wrap="nowrap">
              <IconBrandTwitch
                size={28}
                color="#9146ff"
                style={{ flexShrink: 0 }}
              />
              <Stack gap={0}>
                <Text fw={600}>{interview.title}</Text>
                <Text size="xs" c="dimmed">
                  {formatNewsDate(interview.date)} ·{" "}
                  {formatMinutes(interview.minutes)}
                </Text>
              </Stack>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function CandidateCard({
  candidate,
  highlighted,
}: Readonly<{ candidate: CsmCandidate; highlighted: boolean }>) {
  return (
    <Card
      id={csmCandidateAnchor(candidate.characterId)}
      withBorder
      padding="md"
      className={classes.candidate}
      data-highlighted={highlighted || undefined}
    >
      <Stack gap="sm" h="100%">
        <CharacterCard
          characterId={candidate.characterId}
          withCsmBadge={false}
        />
        <Text size="sm" className={classes.pitch} style={{ flexGrow: 1 }}>
          {candidate.pitch}
        </Text>
        <Button
          component="a"
          href={candidate.forumThread}
          target="_blank"
          rel="noopener noreferrer"
          variant="light"
          color={CSM_21_RED}
          size="xs"
          leftSection={<IconMessages size={14} />}
          rightSection={<IconExternalLink size={12} />}
          style={{ alignSelf: "flex-start" }}
        >
          Campaign thread
        </Button>
      </Stack>
    </Card>
  );
}

function Candidates({ election }: Readonly<CsmPageProps>) {
  const [query, setQuery] = useState("");
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const candidates = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return election.candidates;
    return election.candidates.filter(
      (candidate) =>
        normalize(candidate.name).includes(needle) ||
        normalize(candidate.pitch).includes(needle),
    );
  }, [election.candidates, query]);

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Title order={3}>Candidates</Title>
          <Text size="sm" c="dimmed">
            {election.candidates.length} candidates, in the order of the
            official announcement. Pitches are quoted from it.
          </Text>
        </Stack>
        <TextInput
          aria-label="Search candidates"
          placeholder="Search names and pitches"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          w={{ base: "100%", sm: 280 }}
        />
      </Group>
      {candidates.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No candidate matches &ldquo;{query}&rdquo;.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.characterId}
              candidate={candidate}
              highlighted={
                hash === `#${csmCandidateAnchor(candidate.characterId)}`
              }
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

export default function CsmPage({ election }: Readonly<CsmPageProps>) {
  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Hero election={election} />
        <Interviews election={election} />
        <Candidates election={election} />
      </Stack>
    </Container>
  );
}
