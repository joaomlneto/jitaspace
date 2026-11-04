/**
 * The timeline of public contracts (firstSeenAt, lastSeenAt, endReason,
 * isDeleted), worked out from each region's latest public listing. Pure:
 * `contractTimelineStore.ts` writes what {@link planRegionListing} returns. Kept
 * free of ESI/Prisma runtime imports so it can be unit-tested directly.
 *
 * Contracts leave the listing when accepted, completed, deleted or expired, and
 * the public data cannot tell the first three apart. The rules:
 *   - a region's listing counts as complete only if its contract count is near
 *     the region's recent median; only a complete listing ends anything;
 *   - a contract missing from a complete listing has ended: endReason =
 *     RemovedBeforeExpiry if its expiry was still ahead; Expired if it expired
 *     between last seen and this listing, unless those were more than GAP_MS
 *     apart (then NULL: it may have been accepted first);
 *   - a contract that reappears is reopened.
 *
 * Auctions' expiry is rounded up. ESI gives an auction's date_expired as the
 * listing's time plus the time left rounded up to whole days (whole hours in
 * its last day), and its date_issued only to the day. So every listing gives an
 * upper bound, and the store keeps the lowest one seen. Once the auction has
 * been listed in its last day, that bound is a listing's time plus whole hours:
 * a point on the half-hour grid of its region's listings, at or after the true
 * expiry, so at most 30 minutes after the first listing that misses it. An
 * auction only counts as removed before expiry if it went missing more than
 * {@link AUCTION_EXPIRY_SLACK_MS} before that bound, so one bought out in its
 * last half hour reads as expired.
 *
 * One miss is enough because ESI's listing is consistent: every page of a
 * region shares one Last-Modified (the job refetches if they don't), and The
 * Forge's 35-page cap keeps the lowest IDs, so a listed contract can only drop
 * out of the listing by ending.
 *
 * Writes stay cheap: a contract's lastSeenAt is not written each run. Every
 * outstanding contract was listed in its region's last complete listing (any
 * missing from it ended then), so that listing's time is its lastSeen unless
 * the stored one is later. It is written when the contract ends, and by a daily
 * checkpoint.
 */

export const GAP_MS = 2 * 60 * 60 * 1000;
/**
 * How far past the first listing that misses an expired auction its stored
 * expiry can be: one listing interval, plus a minute for the listings'
 * Last-Modified jitter.
 */
export const AUCTION_EXPIRY_SLACK_MS = 31 * 60 * 1000;
/** A region is complete if its count is at least 70% of its recent median. */
export const COMPLETE_FRACTION = 0.7;
/** Regions typically listing fewer contracts than this: complete when present. */
export const TINY_REGION = 20;
/** Listings of each region's count the median looks back over. */
export const REGION_HISTORY_LENGTH = 20;
/** Counts needed before a region is judged against its median. */
export const MIN_HISTORY = 5;

export type ContractEndReason = "Expired" | "RemovedBeforeExpiry";

/** What the job remembers of a region between runs. Times are epoch ms. */
export interface RegionHistory {
  /** Last-Modified of the last listing applied. */
  lastModified: number;
  /** Last-Modified of the last complete listing applied; null if none yet. */
  lastCompleteAt: number | null;
  /** Contract counts of the latest listings, oldest first. */
  counts: number[];
}

/** An outstanding contract of the region, as stored. Times are epoch ms. */
export interface OutstandingContract {
  contractId: number;
  dateExpired: number;
  /** Auctions' dateExpired is an upper bound (see the module comment). */
  isAuction: boolean;
  /** Stored lastSeenAt (or firstSeenAt, or dateIssued, whichever is set). */
  lastSeenAt: number;
}

export interface ContractEnd {
  contractId: number;
  lastSeenAt: number;
  endReason: ContractEndReason | null;
}

export type RegionPlan =
  | {
      /** Already applied (or older than one that was): nothing to do. */
      skip: true;
    }
  | {
      skip: false;
      complete: boolean;
      ends: ContractEnd[];
      history: RegionHistory;
    };

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * Whether a listing of `count` contracts is a complete one, given the region's
 * recent counts. A region is complete unless its count collapsed versus its
 * recent median (a failed listing). Counts are always recorded, so a genuine
 * decline is absorbed within a few listings instead of leaving the region
 * "incomplete" for good. Tiny regions swing too much to tell a failed listing
 * from noise: present = complete.
 */
export const isRegionComplete = (history: number[], count: number) => {
  const typical = median(history);
  return history.length < MIN_HISTORY || typical < TINY_REGION
    ? count > 0 || typical < 3
    : count >= COMPLETE_FRACTION * typical;
};

/**
 * Gone while its expiry was still ahead: removed before expiry, however long
 * the gap. Expiry fell between last seen and first missed: expired, unless that
 * window is so long it could equally have been accepted first (then unknown).
 * `expirySlack` is how far dateExpired may be above the true expiry.
 */
export const endReasonOf = (
  dateExpired: number,
  lastSeen: number,
  firstMissed: number,
  expirySlack = 0,
): ContractEndReason | null => {
  if (dateExpired > firstMissed + expirySlack) return "RemovedBeforeExpiry";
  return firstMissed - lastSeen <= GAP_MS ? "Expired" : null;
};

/**
 * What one region's listing changes. `history` is null the first time the job
 * sees the region; the contracts the database holds as outstanding there then
 * stand in for its history (as {@link MIN_HISTORY} counts, so they are judged
 * against at once), and a first listing that lost most of them is not taken as
 * complete. Real counts replace them as listings come in.
 */
export const planRegionListing = ({
  history,
  observedAt,
  listedIds,
  outstanding,
}: {
  history: RegionHistory | null;
  /** Epoch ms: the listing's Last-Modified. */
  observedAt: number;
  listedIds: ReadonlySet<number>;
  outstanding: readonly OutstandingContract[];
}): RegionPlan => {
  // ESI may serve a stale copy of a listing already applied: ignore it.
  if (history && observedAt <= history.lastModified) return { skip: true };

  const counts =
    history?.counts ??
    (outstanding.length > 0
      ? new Array<number>(MIN_HISTORY).fill(outstanding.length)
      : []);
  const count = listedIds.size;
  // A region that has never listed anything is not judged: its empty listing
  // may as well be a failed one.
  const complete =
    (count > 0 || counts.length > 0) &&
    isRegionComplete(counts.slice(-REGION_HISTORY_LENGTH), count);
  const previous = history?.lastCompleteAt ?? -Infinity;
  const ends = complete
    ? outstanding
        .filter((c) => !listedIds.has(c.contractId))
        .map((c) => {
          const lastSeenAt = Math.max(c.lastSeenAt, previous);
          return {
            contractId: c.contractId,
            lastSeenAt,
            endReason: endReasonOf(
              c.dateExpired,
              lastSeenAt,
              observedAt,
              c.isAuction ? AUCTION_EXPIRY_SLACK_MS : 0,
            ),
          };
        })
    : [];
  // A region's history starts once it has listed something.
  const nextCounts =
    count > 0 || counts.length > 0 ? [...counts, count] : counts;
  return {
    skip: false,
    complete,
    ends,
    history: {
      lastModified: observedAt,
      lastCompleteAt: complete ? observedAt : (history?.lastCompleteAt ?? null),
      counts: nextCounts.slice(-REGION_HISTORY_LENGTH),
    },
  };
};
