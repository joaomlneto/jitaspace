"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Container, Group, Stack, Tabs, Title } from "@mantine/core";

import { IncursionsIcon } from "@jitaspace/eve-icons";

import type { IncursionRatGroup, IncursionsData } from "./types";
import { ArchiveTab, TimelineTab } from "./HistoryTabs";
import { useNames } from "./parts";
import { RatsTab } from "./RatsTab";
import { StatusTab } from "./StatusTab";

const TABS = ["status", "timeline", "archive", "rats"] as const;
type Tab = (typeof TABS)[number];
const isTab = (value: string): value is Tab =>
  (TABS as readonly string[]).includes(value);

/** The job polls every 5 minutes; refresh the page's data as often. */
const REFRESH_MS = 5 * 60 * 1000;

// The tab lives in the URL hash, so links can point at one. Read through a
// store rather than state, so the prerender (no hash) and hydration agree and
// the hash takes over once hydrated.
const hashListeners = new Set<() => void>();
const subscribeToHash = (listener: () => void) => {
  hashListeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    hashListeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
};
const getHash = () => window.location.hash.slice(1);
const getServerHash = () => "";
const setHash = (tab: Tab) => {
  window.history.replaceState(
    window.history.state,
    "",
    // Keep the path and query; only the hash names the tab.
    `${window.location.pathname}${window.location.search}${tab === "status" ? "" : `#${tab}`}`,
  );
  for (const notify of hashListeners) notify();
};

export default function IncursionsPage({
  data,
  rats,
}: Readonly<{ data: IncursionsData; rats: IncursionRatGroup[] }>) {
  const names = useNames(data);
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const tab: Tab = isTab(hash) ? hash : "status";

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group>
          <IncursionsIcon width={48} />
          <Title>Incursions</Title>
        </Group>

        <Tabs
          value={tab}
          onChange={(value) => {
            if (value && isTab(value)) setHash(value);
          }}
          keepMounted={false}
        >
          <Tabs.List mb="md">
            <Tabs.Tab value="status">Status</Tabs.Tab>
            <Tabs.Tab value="timeline">Timeline</Tabs.Tab>
            <Tabs.Tab value="archive">Archive</Tabs.Tab>
            <Tabs.Tab value="rats">Rats</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="status">
            <StatusTab data={data} names={names} />
          </Tabs.Panel>
          <Tabs.Panel value="timeline">
            <TimelineTab data={data} />
          </Tabs.Panel>
          <Tabs.Panel value="archive">
            <ArchiveTab data={data} />
          </Tabs.Panel>
          <Tabs.Panel value="rats">
            <RatsTab rats={rats} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
