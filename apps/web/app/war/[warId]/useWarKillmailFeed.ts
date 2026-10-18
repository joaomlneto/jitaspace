"use client";

import { useCallback, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";

import { useWarKillmails } from "@jitaspace/hooks";

import type { ZkbKillmail } from "~/components/Killmails";
import { ZKB_PAGE_SIZE, zkillboardWarKillsUrl } from "~/components/Killmails";

/**
 * How many killmail cards to mount at a time. Cards zKillboard did not cover
 * fetch their own killmail from ESI, and a war can have thousands.
 */
export const KILLMAILS_PER_BATCH = 25;

export interface WarKillmailEntry {
  killmailId: number;
  hash: string;
  /** The full killmail and its valuation, when zKillboard had it. */
  zkb?: ZkbKillmail;
}

async function fetchZkbPage(url: string): Promise<ZkbKillmail[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`zKillboard answered ${response.status}`);
  const body: unknown = await response.json();
  // zKillboard reports some failures as a 200 carrying `{ error }`.
  if (!Array.isArray(body)) throw new Error("zKillboard sent no killmails");
  return body as ZkbKillmail[];
}

/**
 * A war's killmails, newest first. ESI's list is the authority on which
 * killmails there are; zKillboard's war feed carries each one in full plus
 * its ISK value, 200 to a request, so a card it covers needs no ESI request
 * of its own. zKillboard pages are fetched only as far as the cards shown.
 */
export function useWarKillmailFeed(warId: number) {
  const isValidWar = Number.isSafeInteger(warId) && warId > 0;
  const { data: esi, isLoading: isEsiLoading } = useWarKillmails(
    isValidWar ? warId : undefined,
  );

  const [visibleCount, setVisibleCount] = useState(KILLMAILS_PER_BATCH);
  // Reset when navigating between wars; the page component is reused, so this
  // happens during render rather than in an effect.
  const [trackedWarId, setTrackedWarId] = useState(warId);
  if (warId !== trackedWarId) {
    setTrackedWarId(warId);
    setVisibleCount(KILLMAILS_PER_BATCH);
  }

  const zkb = useSWRInfinite<ZkbKillmail[], Error>(
    (index, previous: ZkbKillmail[] | null) => {
      if (!isValidWar) return null;
      if (previous && previous.length < ZKB_PAGE_SIZE) return null;
      return zkillboardWarKillsUrl(warId, index + 1);
    },
    fetchZkbPage,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  const zkbPages = zkb.data;
  const zkbById = useMemo(() => {
    const byId = new Map<number, ZkbKillmail>();
    for (const page of zkbPages ?? [])
      for (const killmail of page) byId.set(killmail.killmail_id, killmail);
    return byId;
  }, [zkbPages]);

  const lastPage = zkbPages?.at(-1);
  const isZkbExhausted =
    zkb.error !== undefined ||
    (lastPage !== undefined && lastPage.length < ZKB_PAGE_SIZE);
  /** zKillboard pages are still on their way for the cards being shown. */
  const isZkbLoading =
    !isZkbExhausted && (zkb.isLoading || (zkbPages?.length ?? 0) < zkb.size);

  const esiList = esi?.data;
  const entries = useMemo<WarKillmailEntry[]>(() => {
    const byId = new Map<number, WarKillmailEntry>();
    for (const { killmail_id, killmail_hash } of esiList ?? [])
      byId.set(killmail_id, {
        killmailId: killmail_id,
        hash: killmail_hash,
        zkb: zkbById.get(killmail_id),
      });
    // Should ESI's list be missing or short, zKillboard's own fills it in.
    for (const killmail of zkbById.values())
      if (!byId.has(killmail.killmail_id))
        byId.set(killmail.killmail_id, {
          killmailId: killmail.killmail_id,
          hash: killmail.zkb.hash,
          zkb: killmail,
        });
    return [...byId.values()].sort((a, b) => b.killmailId - a.killmailId);
  }, [esiList, zkbById]);

  const { setSize } = zkb;
  const showMore = useCallback(() => {
    const next = visibleCount + KILLMAILS_PER_BATCH;
    setVisibleCount(next);
    void setSize(Math.ceil(next / ZKB_PAGE_SIZE));
  }, [visibleCount, setSize]);

  return {
    entries,
    visible: entries.slice(0, visibleCount),
    remaining: Math.max(entries.length - visibleCount, 0),
    showMore,
    isLoading: isEsiLoading && entries.length === 0,
    isZkbLoading,
    hasZkbError: zkb.error !== undefined,
  };
}

export type WarKillmailFeed = ReturnType<typeof useWarKillmailFeed>;
