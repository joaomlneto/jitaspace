"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import useSWRInfinite from "swr/infinite";

import type {
  GetWarsWarIdKillmailsQueryResponse,
  ResponseConfig,
} from "@jitaspace/esi-client";
import { getWarsWarIdKillmailsQueryOptions } from "@jitaspace/esi-client";
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

type EsiPage = ResponseConfig<GetWarsWarIdKillmailsQueryResponse>;

async function fetchZkbPage(url: string): Promise<ZkbKillmail[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`zKillboard answered ${response.status}`);
  const body: unknown = await response.json();
  // zKillboard reports some failures as a 200 carrying `{ error }`.
  if (!Array.isArray(body)) throw new Error("zKillboard sent no killmails");
  return body as ZkbKillmail[];
}

/** How many pages ESI says the list has, from its `X-Pages` header. */
function pageCount(page: EsiPage | undefined): number {
  const pages = Number(page?.headers["x-pages"]);
  return Number.isSafeInteger(pages) && pages > 1 ? pages : 1;
}

/** ESI's later pages, folded into one result (stable while they settle). */
function combineEsiPages(results: UseQueryResult<EsiPage>[]) {
  return {
    lists: results.map((result) => result.data?.data),
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  };
}

/**
 * A war's killmails, newest first. ESI's list, every page of it, is the
 * authority on which killmails there are; zKillboard's war feed carries each
 * one in full plus its ISK value, 200 to a request, so a card it covers
 * needs no ESI request of its own. zKillboard pages are fetched only as far
 * as the cards shown.
 */
export function useWarKillmailFeed(warId: number) {
  const isValidWar = Number.isSafeInteger(warId) && warId > 0;
  const validWarId = isValidWar ? warId : undefined;
  const firstEsiPage = useWarKillmails(validWarId);
  const laterEsiPages = useQueries({
    queries: Array.from(
      { length: pageCount(firstEsiPage.data) - 1 },
      (_, index) =>
        getWarsWarIdKillmailsQueryOptions(validWarId, { page: index + 2 }),
    ),
    combine: combineEsiPages,
  });
  const isEsiLoading = firstEsiPage.isLoading || laterEsiPages.isLoading;
  const isEsiError = firstEsiPage.isError || laterEsiPages.isError;

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
  /** A zKillboard page is on its way. */
  const isZkbFetching =
    !isZkbExhausted && (zkb.isLoading || (zkbPages?.length ?? 0) < zkb.size);
  /** zKillboard's pages run newest first, so this is the oldest id loaded. */
  const zkbFloor = lastPage?.at(-1)?.killmail_id;

  /**
   * Whether a killmail zKillboard has not sent may still arrive with the page
   * in flight: only if it is older than everything loaded so far. Anything
   * newer would already be here, so it is fetched from ESI instead.
   */
  const awaitsZkb = useCallback(
    (killmailId: number) =>
      isZkbFetching && (zkbFloor === undefined || killmailId < zkbFloor),
    [isZkbFetching, zkbFloor],
  );

  const firstEsiList = firstEsiPage.data?.data;
  const laterEsiLists = laterEsiPages.lists;
  const entries = useMemo<WarKillmailEntry[]>(() => {
    const byId = new Map<number, WarKillmailEntry>();
    for (const list of [firstEsiList, ...laterEsiLists])
      for (const { killmail_id, killmail_hash } of list ?? [])
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
  }, [firstEsiList, laterEsiLists, zkbById]);

  /**
   * zKillboard has more pages than it was asked for: the last one came back
   * full and none is on its way. When ESI's list is missing, this is the only
   * sign that there is more to show.
   */
  const zkbHasMore =
    !isZkbExhausted &&
    lastPage !== undefined &&
    (zkbPages?.length ?? 0) === zkb.size;
  const remaining = Math.max(entries.length - visibleCount, 0);

  const { setSize, size } = zkb;
  const showMore = useCallback(() => {
    const next = visibleCount + KILLMAILS_PER_BATCH;
    setVisibleCount(next);
    // Ask for the pages the next batch spans, and at least one more once the
    // loaded kills run out.
    const wanted = Math.ceil(next / ZKB_PAGE_SIZE);
    void setSize(
      remaining === 0 && zkbHasMore ? Math.max(wanted, size + 1) : wanted,
    );
  }, [visibleCount, remaining, zkbHasMore, size, setSize]);

  const isEmpty = entries.length === 0;
  return {
    entries,
    visible: entries.slice(0, visibleCount),
    remaining,
    /** More can be shown: loaded kills not yet visible, or zKillboard pages. */
    hasMore: remaining > 0 || zkbHasMore,
    /** A zKillboard page asked for by "load more" is on its way. */
    isLoadingMore: !isEmpty && remaining === 0 && isZkbFetching,
    /**
     * The count is a floor, not a total: ESI's list failed, so only what
     * zKillboard has sent so far is known, and it may have more.
     */
    isCountPartial: isEsiError && !isZkbExhausted,
    showMore,
    awaitsZkb,
    /** Nothing to show yet, and an answer is still on its way. */
    isLoading: isEmpty && (isEsiLoading || (isEsiError && isZkbFetching)),
    /** Nothing to show, because neither source answered. */
    isError: isEmpty && isEsiError && zkb.error !== undefined,
    /** Some ESI page failed, so the list may be short. */
    hasEsiError: isEsiError,
    hasZkbError: zkb.error !== undefined,
    /** How many zKillboard pages arrived before any error. */
    zkbPageCount: zkbPages?.length ?? 0,
  };
}

export type WarKillmailFeed = ReturnType<typeof useWarKillmailFeed>;
