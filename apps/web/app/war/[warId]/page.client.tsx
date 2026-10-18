"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import {
  KillReportIcon,
  WarReportIcon,
  WindowAlliancesIcon,
  WindowInfoIcon,
} from "@jitaspace/eve-icons";
import { useWar } from "@jitaspace/hooks";

import type { WarPageTab } from "./tabs";
import type { WarKillmailFeed } from "./useWarKillmailFeed";
import { SectionHeading } from "~/components/EntityPage";
import { formatInteger } from "~/lib/format";
import { deriveWarStatus } from "~/lib/warStatus";
import { AlliesGrid, KillmailList, WarTimeline } from "./parts";
import { DEFAULT_WAR_PAGE_TAB, isWarPageTab, WAR_PAGE_TABS } from "./tabs";
import { useWarKillmailFeed } from "./useWarKillmailFeed";
import { WarHeader } from "./WarHeader";

/** How many of the newest kills the Overview tab shows. */
const RECENT_KILLMAILS = 5;

/** How the Killmails tab owns up to what the sources failed to send. */
function sourcesNote(feed: WarKillmailFeed) {
  const notes: string[] = [];
  if (feed.hasZkbError && feed.zkbPageCount === 0)
    notes.push("zKillboard did not answer, so values are missing");
  else if (feed.hasZkbError)
    notes.push(
      feed.hasEsiError
        ? "zKillboard stopped answering, so older kills are missing"
        : "zKillboard stopped answering, so older kills may lack values",
    );
  if (feed.hasEsiError)
    notes.push("ESI did not answer for every page, so the list may be short");
  return notes.length === 0
    ? "."
    : `. ${notes.join("; ")}. Reload the page to try again.`;
}

/** "694", or "200+" when only part of the list is known. */
function killmailCount(feed: WarKillmailFeed) {
  return `${formatInteger(feed.entries.length)}${feed.isCountPartial ? "+" : ""}`;
}

const toDate = (iso: string | undefined) =>
  iso === undefined ? null : new Date(iso);

export default function Page() {
  const params = useParams();
  const rawWarId = params.warId;
  const warId = Number(typeof rawWarId === "string" ? rawWarId : rawWarId?.[0]);
  const { data } = useWar(warId);
  const war = data?.data;
  const feed = useWarKillmailFeed(warId);
  // Fixed for the visit, so the status and timeline don't shift as it renders.
  const [now] = useState(() => Date.now());

  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(WAR_PAGE_TABS)
      .withDefault(DEFAULT_WAR_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  if (!Number.isFinite(warId)) return null;

  const allies = war?.allies ?? [];
  const status = war
    ? deriveWarStatus(
        {
          startedDate: toDate(war.started),
          finishedDate: toDate(war.finished),
          retractedDate: toDate(war.retracted),
        },
        now,
      )
    : undefined;

  const visibleTabs: Record<WarPageTab, boolean> = {
    overview: true,
    killmails: true,
    allies: allies.length > 0,
  };
  const selectedTab = visibleTabs[activeTab] ? activeTab : DEFAULT_WAR_PAGE_TAB;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <WarHeader warId={warId} war={war} status={status} now={now} />

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isWarPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<WindowInfoIcon size={16} alt="" />}
            >
              Overview
            </Tabs.Tab>
            <Tabs.Tab
              value="killmails"
              leftSection={<KillReportIcon size={16} alt="" />}
            >
              {feed.isLoading || feed.isError
                ? "Killmails"
                : `Killmails (${killmailCount(feed)})`}
            </Tabs.Tab>
            {visibleTabs.allies && (
              <Tabs.Tab
                value="allies"
                leftSection={<WindowAlliancesIcon size={16} alt="" />}
              >
                Allies ({formatInteger(allies.length)})
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="xl">
              <Grid gap="lg">
                {war && (
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Stack gap="sm">
                      <SectionHeading icon={<WarReportIcon size={20} alt="" />}>
                        Timeline
                      </SectionHeading>
                      <Paper withBorder radius="md" p="md">
                        <WarTimeline war={war} now={now} />
                      </Paper>
                    </Stack>
                  </Grid.Col>
                )}
                <Grid.Col span={{ base: 12, md: war ? 8 : 12 }}>
                  <Stack gap="sm">
                    <SectionHeading icon={<KillReportIcon size={20} alt="" />}>
                      Latest kills
                    </SectionHeading>
                    <KillmailList
                      war={war}
                      feed={feed}
                      limit={RECENT_KILLMAILS}
                      footer={
                        feed.entries.length > RECENT_KILLMAILS && (
                          <Button
                            variant="subtle"
                            onClick={() => void setActiveTab("killmails")}
                          >
                            See all {killmailCount(feed)} killmails
                          </Button>
                        )
                      }
                    />
                  </Stack>
                </Grid.Col>
              </Grid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="killmails" pt="lg">
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Newest first. Values and full killmails from{" "}
                <a
                  href={`https://zkillboard.com/war/${warId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  zKillboard
                </a>
                {sourcesNote(feed)}
              </Text>
              <KillmailList war={war} feed={feed} />
            </Stack>
          </Tabs.Panel>

          {visibleTabs.allies && (
            <Tabs.Panel value="allies" pt="lg">
              <AlliesGrid allies={allies} />
            </Tabs.Panel>
          )}
        </Tabs>
      </Stack>
    </Container>
  );
}
