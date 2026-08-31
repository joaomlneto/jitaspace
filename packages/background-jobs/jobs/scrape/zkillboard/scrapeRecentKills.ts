import type { GetKillmailsKillmailIdKillmailHash200 } from "@jitaspace/esi-client";

import type { JobContext } from "../../../core";
import type { Prisma } from "../../../db";
import { postUpdateCard } from "../../../chat";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { getRedis } from "../../../kv";

const R2Z2_BASE_URL = "https://r2z2.zkillboard.com/ephemeral";
const R2Z2_SEQUENCE_URL = `${R2Z2_BASE_URL}/sequence.json`;
const R2Z2_CURSOR_KEY = "zkillboard:r2z2:next-sequence";
const R2Z2_RATE_LIMIT_UNTIL_KEY = "zkillboard:r2z2:rate-limit-until";
/** `"<startCursor>:<count>"` — consecutive failed attempts at the same batch. */
const R2Z2_BATCH_FAILURE_KEY = "zkillboard:r2z2:batch-failures";
/** Ranges the job gave up on, newest first, so nothing vanishes unrecorded. */
const R2Z2_SKIPPED_RANGES_KEY = "zkillboard:r2z2:skipped-ranges";
const USER_AGENT = "www.jita.space - Joao Neto - joao@jita.space";
const MAX_KILLMAILS_PER_RUN = 100;
/**
 * How many sequences in an unbroken run may 404 before we conclude the feed has
 * expired past us rather than that we hit an ordinary hole.
 */
const MAX_CONSECUTIVE_MISSING_SEQUENCES = 25;
/**
 * How many times one batch may fail before it is skipped. Transient failures (a
 * database blip) get retried; a genuinely unprocessable batch is quarantined
 * instead of blocking the cursor forever.
 */
const MAX_BATCH_FAILURES = 3;
/** Cap on the skipped-range list so it cannot grow without bound. */
const MAX_SKIPPED_RANGES_KEPT = 200;
const RATE_LIMIT_FALLBACK_SLEEP_SECONDS = 60;
const RATE_LIMIT_MIN_INTERVAL_MS = 50;
let lastRequestAt = 0;

interface ZkbMetadata {
  locationID: number;
  hash: string;
  fittedValue: number;
  droppedValue: number;
  destroyedValue: number;
  totalValue: number;
  points: number;
  npc: boolean;
  solo: boolean;
  awox: boolean;
  labels: string[];
  attackerCount: number;
  href: string;
  war_id?: number;
}

interface R2Z2Package {
  killmail_id: number;
  hash: string;
  sequence_id: number;
  uploaded_at: number;
  esi: GetKillmailsKillmailIdKillmailHash200;
  zkb: ZkbMetadata;
}

const toBigInt = (value: number | string | bigint) =>
  typeof value === "bigint" ? value : BigInt(value);

const parseSequenceId = (payload: unknown): string => {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const value =
      record.sequence_id ?? record.sequence ?? record.sequenceId ?? null;
    if (typeof value === "number" || typeof value === "string") {
      return value.toString();
    }
  }
  throw new Error("Invalid sequence payload from R2Z2");
};

const parseRetryAfterSeconds = (value: string | null): number | null => {
  if (!value) return null;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.ceil(asNumber);
  }
  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) {
    const seconds = Math.ceil((asDate - Date.now()) / 1000);
    return Math.max(0, seconds);
  }
  return null;
};

const toSleepDuration = (seconds?: number | null) => {
  const boundedSeconds =
    seconds && Number.isFinite(seconds) && seconds > 0
      ? Math.ceil(seconds)
      : RATE_LIMIT_FALLBACK_SLEEP_SECONDS;
  return `${boundedSeconds}s`;
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const enforceRateLimit = async () => {
  const now = Date.now();
  const waitMs = RATE_LIMIT_MIN_INTERVAL_MS - (now - lastRequestAt);
  if (waitMs > 0) {
    await delay(waitMs);
  }
  lastRequestAt = Date.now();
};

const flattenVictimItems = (
  items: GetKillmailsKillmailIdKillmailHash200["victim"]["items"] | undefined,
) => {
  type Item = NonNullable<
    GetKillmailsKillmailIdKillmailHash200["victim"]["items"]
  >[number];

  const flattened: { item: Item; parentIndex: number | null }[] = [];

  const visit = (entries: Item[], parentIndex: number | null) => {
    for (const entry of entries) {
      const index = flattened.length;
      flattened.push({ item: entry, parentIndex });
      if (entry.items && entry.items.length > 0) {
        visit(entry.items, index);
      }
    }
  };

  if (items && items.length > 0) {
    visit(items, null);
  }

  return flattened;
};

const fetchJson = async (url: string) => {
  const redis = await getRedis();
  const rateLimitUntilStr = await redis.get(R2Z2_RATE_LIMIT_UNTIL_KEY);
  if (rateLimitUntilStr) {
    const rateLimitUntil = Number.parseInt(rateLimitUntilStr, 10);
    const now = Date.now();
    if (rateLimitUntil > now) {
      return {
        status: 429 as const,
        data: null,
        retryAfterSeconds: Math.ceil((rateLimitUntil - now) / 1000),
      };
    }
  }

  console.log("fetching", url);
  await enforceRateLimit();
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (response.status === 404) {
    return { status: 404 as const, data: null, retryAfterSeconds: null };
  }

  if (response.status === 429) {
    const retryAfterSeconds = parseRetryAfterSeconds(
      response.headers.get("retry-after"),
    );
    const sleepDuration =
      retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS;
    const rateLimitUntil = Date.now() + sleepDuration * 1000;
    await redis.set(R2Z2_RATE_LIMIT_UNTIL_KEY, rateLimitUntil.toString(), {
      PX: sleepDuration * 1000,
    });

    return {
      status: 429 as const,
      data: null,
      retryAfterSeconds,
    };
  }

  if (!response.ok) {
    console.log({ response });
    throw new Error(
      `R2Z2 request failed (${response.status}): ${response.statusText}`,
    );
  }

  return {
    status: response.status,
    data: (await response.json()) as unknown,
    retryAfterSeconds: null,
  };
};

const formatRange = (start: bigint | null, endExclusive: bigint | null) => {
  if (start === null || endExclusive === null || endExclusive <= start) {
    return "none";
  }
  return `${start.toString()}-${(endExclusive - 1n).toString()}`;
};

const formatLag = (latest: bigint | null, cursor: bigint | null) => {
  if (latest === null || cursor === null) return "unknown";
  return (latest > cursor ? latest - cursor : 0n).toString();
};

/**
 * Note a range the job moved past without ingesting.
 *
 * Skipping is always a last resort — the feed aged out from under us, or a
 * batch failed often enough to be quarantined — but it has to be recoverable
 * and visible rather than silent, so every skip lands in a capped Redis list
 * that a backfill can replay from.
 */
const recordSkippedRange = async (
  redis: Awaited<ReturnType<typeof getRedis>>,
  from: bigint,
  toExclusive: bigint,
  reason: string,
) => {
  if (toExclusive <= from) return;
  await redis.lPush(
    R2Z2_SKIPPED_RANGES_KEY,
    JSON.stringify({
      from: from.toString(),
      to: (toExclusive - 1n).toString(),
      count: (toExclusive - from).toString(),
      reason,
    }),
  );
  await redis.lTrim(R2Z2_SKIPPED_RANGES_KEY, 0, MAX_SKIPPED_RANGES_KEPT - 1);
};

/**
 * Record a failed attempt at the batch starting at `startCursor` and return how
 * many consecutive attempts that batch has now cost.
 *
 * The count is keyed on the batch's own start sequence, so moving on resets it:
 * three unrelated failures at three different cursors are three first attempts,
 * not one batch about to be quarantined.
 */
const countBatchFailure = async (
  redis: Awaited<ReturnType<typeof getRedis>>,
  startCursor: bigint,
): Promise<number> => {
  const stored = await redis.get(R2Z2_BATCH_FAILURE_KEY);
  const [storedCursor, storedCount] = stored?.split(":") ?? [];
  const previous =
    storedCursor === startCursor.toString()
      ? Number.parseInt(storedCount ?? "0", 10)
      : 0;
  const failures = (Number.isFinite(previous) ? previous : 0) + 1;
  await redis.set(R2Z2_BATCH_FAILURE_KEY, `${startCursor}:${failures}`);
  return failures;
};

/**
 * Count this failure and, once a batch has failed too often, skip past it.
 *
 * The cursor only advances on success, so a batch that can never be processed
 * used to block the feed permanently: `retries: 0` means no retry, and every
 * later run re-fetched the same sequences and failed the same way. Counting
 * attempts lets a transient failure be retried while an unprocessable batch is
 * given up on, so the feed keeps moving either way.
 *
 * Returns whether the batch was abandoned.
 */
const quarantineExhaustedBatch = async (
  ctx: JobContext,
  redis: Awaited<ReturnType<typeof getRedis>>,
  startCursor: bigint | null,
  cursor: bigint | null,
  message: string,
): Promise<boolean> => {
  if (startCursor === null || cursor === null || cursor <= startCursor) {
    return false;
  }

  const failures = await countBatchFailure(redis, startCursor);
  if (failures < MAX_BATCH_FAILURES) return false;

  await recordSkippedRange(
    redis,
    startCursor,
    cursor,
    `failed ${failures} times: ${message}`,
  );
  await redis.set(R2Z2_CURSOR_KEY, cursor.toString());
  await redis.del(R2Z2_BATCH_FAILURE_KEY);
  ctx.logger.error(
    "Quarantined an unprocessable R2Z2 batch and advanced the cursor.",
    {
      range: formatRange(startCursor, cursor),
      attempts: failures,
      error: message,
    },
  );
  return true;
};

type LatestSequence =
  | { rateLimited: false; sequence: bigint; raw: string }
  | { rateLimited: true; retryAfterSeconds: number | null };

/**
 * Read the head of the feed, separating "we are throttled" — which the caller
 * backs off from quietly — from "the feed is broken", which is a real failure.
 */
const fetchLatestSequence = async (
  ctx: JobContext,
): Promise<LatestSequence> => {
  const value = await ctx.run("Fetch latest R2Z2 sequence", async () => {
    const payload = await fetchJson(R2Z2_SEQUENCE_URL);
    if (payload.status === 429) return payload;
    if (payload.status === 404 || !payload.data) {
      throw new Error("R2Z2 sequence.json not available");
    }
    return parseSequenceId(payload.data);
  });

  if (!value) {
    throw new Error("Invalid latest sequence value from R2Z2.");
  }

  // The step above returns the raw payload only on a 429, so an object here
  // means throttled and nothing else.
  if (typeof value === "object") {
    return {
      rateLimited: true,
      retryAfterSeconds:
        (value as { retryAfterSeconds?: number | null }).retryAfterSeconds ??
        null,
    };
  }

  return { rateLimited: false, sequence: BigInt(value), raw: value };
};

/** Load the stored cursor, seeding it at the feed head on the very first run. */
const loadCursor = async (
  ctx: JobContext,
  redis: Awaited<ReturnType<typeof getRedis>>,
  latestSequenceValue: string,
): Promise<bigint> => {
  const stored = await ctx.run("Load R2Z2 cursor", async () =>
    redis.get(R2Z2_CURSOR_KEY),
  );
  if (stored) return BigInt(stored);

  await ctx.run("Initialize R2Z2 cursor", async () => {
    await redis.set(R2Z2_CURSOR_KEY, latestSequenceValue);
  });
  return BigInt(latestSequenceValue);
};

interface KillmailRows {
  killmailRows: Prisma.KillmailCreateManyInput[];
  victimRows: Prisma.KillmailVictimCreateManyInput[];
  attackerRows: Prisma.KillmailAttackerCreateManyInput[];
  itemRows: Prisma.KillmailVictimItemsCreateManyInput[];
  missingAllianceIds: Set<number>;
  missingCharacterIds: Set<number>;
  missingCorporationIds: Set<number>;
  missingFactionIds: Set<number>;
  missingWarIds: Set<number>;
}

/** Build the killmail/victim/attacker/item rows + referenced-id sets from R2Z2 packages. */
const buildKillmailRows = (packages: R2Z2Package[]): KillmailRows => {
  const missingAllianceIds = new Set<number>();
  const missingCharacterIds = new Set<number>();
  const missingCorporationIds = new Set<number>();
  const missingFactionIds = new Set<number>();
  const missingWarIds = new Set<number>();

  const killmailRows: Prisma.KillmailCreateManyInput[] = [];
  const victimRows: Prisma.KillmailVictimCreateManyInput[] = [];
  const attackerRows: Prisma.KillmailAttackerCreateManyInput[] = [];
  const itemRows: Prisma.KillmailVictimItemsCreateManyInput[] = [];

  const add = (set: Set<number>, value?: number) => {
    if (value != null) set.add(value);
  };

  for (const entry of packages) {
    const killmail = entry.esi;
    const zkb = entry.zkb;
    const killmailId = toBigInt(killmail.killmail_id);
    const warId = killmail.war_id ?? zkb.war_id ?? null;

    if (warId !== null) missingWarIds.add(warId);

    killmailRows.push({
      killmailId,
      hash: zkb.hash,
      killmailTime: new Date(killmail.killmail_time),
      solarSystemId: killmail.solar_system_id,
      moonId: killmail.moon_id ?? null,
      warId,
      metadataLoaded: true,
    });

    const victim = killmail.victim;
    victimRows.push({
      killmailId,
      characterId: victim.character_id ?? null,
      corporationId: victim.corporation_id ?? null,
      allianceId: victim.alliance_id ?? null,
      factionId: victim.faction_id ?? null,
      shipTypeId: victim.ship_type_id,
      damageTaken: victim.damage_taken,
      positionX: victim.position?.x ?? null,
      positionY: victim.position?.y ?? null,
      positionZ: victim.position?.z ?? null,
    });

    flattenVictimItems(victim.items).forEach(
      ({ item, parentIndex }, itemIndex) => {
        itemRows.push({
          killmailId,
          itemIndex,
          parentItemIndex: parentIndex,
          flag: item.flag,
          typeId: item.item_type_id,
          quantityDestroyed: item.quantity_destroyed ?? null,
          quantityDropped: item.quantity_dropped ?? null,
          singleton: toBigInt(item.singleton),
        });
      },
    );

    killmail.attackers.forEach((attacker, attackerIndex) => {
      attackerRows.push({
        killmailId,
        attackerIndex,
        characterId: attacker.character_id ?? null,
        corporationId: attacker.corporation_id ?? null,
        allianceId: attacker.alliance_id ?? null,
        factionId: attacker.faction_id ?? null,
        shipTypeId: attacker.ship_type_id ?? null,
        weaponTypeId: attacker.weapon_type_id ?? null,
        damageDone: attacker.damage_done,
        finalBlow: attacker.final_blow,
        securityStatus: attacker.security_status,
      });
      add(missingAllianceIds, attacker.alliance_id);
      add(missingCharacterIds, attacker.character_id);
      add(missingCorporationIds, attacker.corporation_id);
      add(missingFactionIds, attacker.faction_id);
    });

    add(missingAllianceIds, victim.alliance_id);
    add(missingCharacterIds, victim.character_id);
    add(missingCorporationIds, victim.corporation_id);
    add(missingFactionIds, victim.faction_id);
  }

  return {
    killmailRows,
    victimRows,
    attackerRows,
    itemRows,
    missingAllianceIds,
    missingCharacterIds,
    missingCorporationIds,
    missingFactionIds,
    missingWarIds,
  };
};

/** Every SDE-owned id a batch references, grouped by the table that owns it. */
const collectReferencedIds = (rows: KillmailRows) => {
  const typeIds = new Set<number>();
  const solarSystemIds = new Set<number>();
  const moonIds = new Set<number>();

  for (const killmail of rows.killmailRows) {
    solarSystemIds.add(killmail.solarSystemId);
    if (killmail.moonId != null) moonIds.add(killmail.moonId);
  }
  for (const victim of rows.victimRows) typeIds.add(victim.shipTypeId);
  for (const item of rows.itemRows) typeIds.add(item.typeId);
  for (const attacker of rows.attackerRows) {
    if (attacker.shipTypeId != null) typeIds.add(attacker.shipTypeId);
    if (attacker.weaponTypeId != null) typeIds.add(attacker.weaponTypeId);
  }

  return { typeIds, solarSystemIds, moonIds };
};

/** Which of those ids the database actually holds. */
const findKnownIds = async ({
  typeIds,
  solarSystemIds,
  moonIds,
}: ReturnType<typeof collectReferencedIds>) => {
  const [types, solarSystems, moons] = await Promise.all([
    typeIds.size > 0
      ? prisma.type.findMany({
          select: { typeId: true },
          where: { typeId: { in: [...typeIds] } },
        })
      : [],
    solarSystemIds.size > 0
      ? prisma.solarSystem.findMany({
          select: { solarSystemId: true },
          where: { solarSystemId: { in: [...solarSystemIds] } },
        })
      : [],
    moonIds.size > 0
      ? prisma.moon.findMany({
          select: { moonId: true },
          where: { moonId: { in: [...moonIds] } },
        })
      : [],
  ]);

  return {
    knownTypeIds: new Set(types.map((type) => type.typeId)),
    knownSolarSystemIds: new Set(
      solarSystems.map((system) => system.solarSystemId),
    ),
    knownMoonIds: new Set(moons.map((moon) => moon.moonId)),
  };
};

/**
 * Killmails naming a required row the database lacks, so they cannot be stored
 * at all.
 *
 * Keyed on the string form: `killmailId` is typed `bigint | number`, and 1n and
 * 1 are different Set members.
 */
const findUnstorableKillmailIds = (
  rows: KillmailRows,
  knownTypeIds: ReadonlySet<number>,
  knownSolarSystemIds: ReadonlySet<number>,
) => {
  const unstorable = new Set<string>();

  for (const killmail of rows.killmailRows) {
    if (!knownSolarSystemIds.has(killmail.solarSystemId)) {
      unstorable.add(killmail.killmailId.toString());
    }
  }
  for (const victim of rows.victimRows) {
    if (!knownTypeIds.has(victim.shipTypeId)) {
      unstorable.add(victim.killmailId.toString());
    }
  }
  for (const item of rows.itemRows) {
    if (!knownTypeIds.has(item.typeId)) {
      unstorable.add(item.killmailId.toString());
    }
  }

  return unstorable;
};

/**
 * Drop references the database cannot satisfy, so the insert cannot trip a
 * foreign key.
 *
 * `createCorpAndItsRefRecords` resolves the entities it is able to create on
 * demand, but Type, SolarSystem and Moon are written only by the SDE ingest. A
 * killmail that names something the SDE has not delivered yet — a module first
 * seen on patch day, most likely — would otherwise fail the whole batch on a
 * constraint, which is exactly the failure the cursor used to wedge on.
 *
 * A missing *required* reference (solar system, victim ship, item type) means
 * the killmail cannot be stored at all, so it is dropped and reported. Missing
 * *optional* ones (moon, attacker ship, attacker weapon) are nulled instead —
 * ESI leaves those out routinely, so a null is a shape the readers already
 * expect, and keeping the kill beats discarding it over an unknown weapon.
 */
const dropUnresolvableReferences = async (
  rows: KillmailRows,
): Promise<{ rows: KillmailRows; droppedKillmailIds: string[] }> => {
  const { knownTypeIds, knownSolarSystemIds, knownMoonIds } =
    await findKnownIds(collectReferencedIds(rows));

  const dropped = findUnstorableKillmailIds(
    rows,
    knownTypeIds,
    knownSolarSystemIds,
  );

  const kept = <T extends { killmailId: bigint | number }>(list: T[]) =>
    list.filter((row) => !dropped.has(row.killmailId.toString()));

  const knownTypeOrNull = (typeId: number | null | undefined) =>
    typeId != null && knownTypeIds.has(typeId) ? typeId : null;

  return {
    rows: {
      ...rows,
      killmailRows: kept(rows.killmailRows).map((killmail) => ({
        ...killmail,
        moonId:
          killmail.moonId != null && knownMoonIds.has(killmail.moonId)
            ? killmail.moonId
            : null,
      })),
      victimRows: kept(rows.victimRows),
      attackerRows: kept(rows.attackerRows).map((attacker) => ({
        ...attacker,
        shipTypeId: knownTypeOrNull(attacker.shipTypeId),
        weaponTypeId: knownTypeOrNull(attacker.weaponTypeId),
      })),
      itemRows: kept(rows.itemRows),
    },
    droppedKillmailIds: [...dropped],
  };
};

/** Poll R2Z2 from `startCursor`, returning the packages and the advanced cursor / throttle time. */
const collectKillmailPackages = async (
  ctx: JobContext,
  startCursor: bigint,
  latestSequence: bigint,
): Promise<{
  packages: R2Z2Package[];
  cursor: bigint;
  rateLimitUntilMs: number | null;
  missingSequences: number;
  expiredFrom: bigint | null;
}> => {
  const packages: R2Z2Package[] = [];
  let cursor = startCursor;
  let rateLimitUntilMs: number | null = null;
  let consecutiveMisses = 0;
  let missingSequences = 0;
  let expiredFrom: bigint | null = null;

  for (let i = 0; i < MAX_KILLMAILS_PER_RUN; i++) {
    const response = await fetchJson(`${R2Z2_BASE_URL}/${cursor}.json`);

    if (response.status === 429) {
      const retryAfterSeconds = response.retryAfterSeconds;
      const sleepFor = toSleepDuration(retryAfterSeconds);
      rateLimitUntilMs =
        Date.now() +
        (retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS) * 1000;
      await postUpdateCard({
        status: "rate_limited",
        summary: "Rate limited while fetching sequence.json.",
        throttledUntil: new Date(rateLimitUntilMs).toISOString(),
      });
      await ctx.sleep("Rate limited fetching killmail", sleepFor);
      break;
    }

    if (response.status === 404) {
      // Nothing published at or beyond this sequence yet: we have caught up.
      // Leave the cursor here so the next run picks the entry up once it lands.
      if (cursor >= latestSequence) break;

      // We are behind and this particular sequence is gone. R2Z2 is ephemeral,
      // so isolated holes are normal — step over one rather than abandoning
      // every killmail after it. Only an unbroken run of misses means the feed
      // has aged past the cursor, which is the sole case worth fast-forwarding.
      consecutiveMisses += 1;
      missingSequences += 1;
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSING_SEQUENCES) {
        expiredFrom = cursor - BigInt(consecutiveMisses) + 1n;
        cursor = latestSequence;
        break;
      }

      cursor += 1n;
      continue;
    }

    consecutiveMisses = 0;

    const payload = response.data as Partial<R2Z2Package> | null;
    if (!payload?.esi || !payload.zkb) {
      ctx.logger.warn("Skipping invalid killmail payload from R2Z2.", {
        sequence: cursor.toString(),
      });
      cursor += 1n;
      continue;
    }

    packages.push(payload as R2Z2Package);
    cursor += 1n;
  }

  return { packages, cursor, rateLimitUntilMs, missingSequences, expiredFrom };
};

export type ScrapeRecentKillsEventPayload = Record<string, never>;

export const scrapeZkillboardRecentKills =
  defineJob<ScrapeRecentKillsEventPayload>({
    id: "scrape-zkillboard-recent-kills",
    name: "Scrape Killmails from R2Z2",
    trigger: { type: "event" },
    singleton: true,
    retries: 0,
    description: "Poll zKillboard's R2Z2 sequence feed and ingest killmails.",
    handler: async (ctx) => {
      const redis = await getRedis();
      let latestSequence: bigint | null = null;
      let startCursor: bigint | null = null;
      let cursor: bigint | null = null;
      let rateLimitUntilMs: number | null = null;

      try {
        const latest = await fetchLatestSequence(ctx);

        if (latest.rateLimited) {
          rateLimitUntilMs =
            Date.now() +
            (latest.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS) *
              1000;
          await postUpdateCard({
            status: "rate_limited",
            summary: "Rate limited while fetching sequence.json.",
            throttledUntil: new Date(rateLimitUntilMs).toISOString(),
          });
          return {
            processed: 0,
            rateLimited: true,
            retryAfterSeconds: latest.retryAfterSeconds,
          };
          /*
        const sleepFor = toSleepDuration(retryAfterSeconds);
        rateLimitUntilMs =
          Date.now() +
          (retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS) * 1000;
        await ctx.sleep("Rate limited fetching sequence.json", sleepFor);
        await postUpdateCard({
          status: "rate_limited",
          summary: "Rate limited while fetching sequence.json.",
          throttledUntil: new Date(rateLimitUntilMs).toISOString(),
        });*/
        }

        latestSequence = latest.sequence;

        cursor = await loadCursor(ctx, redis, latest.raw);
        startCursor = cursor;

        const collected = await collectKillmailPackages(
          ctx,
          cursor,
          latestSequence,
        );
        const killmailPackages = collected.packages;
        cursor = collected.cursor;
        rateLimitUntilMs = collected.rateLimitUntilMs;

        if (collected.expiredFrom !== null) {
          await recordSkippedRange(
            redis,
            collected.expiredFrom,
            latestSequence,
            "expired from the R2Z2 feed",
          );
          ctx.logger.warn("R2Z2 aged past the cursor; fast-forwarded.", {
            from: collected.expiredFrom.toString(),
            to: latestSequence.toString(),
          });
        }

        if (killmailPackages.length === 0) {
          // Nothing to insert, but the cursor may still have moved — past holes
          // we stepped over, or forward to `latestSequence` because the feed
          // aged out. Persist it, or the next run re-walks the same 404s.
          await redis.set(R2Z2_CURSOR_KEY, cursor.toString());

          await postUpdateCard({
            status: "idle",
            summary: "No new killmails processed this run.",
            processed: 0,
            range: formatRange(startCursor, cursor),
            lag: formatLag(latestSequence, cursor),
            latestSequence,
            nextSequence: cursor,
            throttledUntil: rateLimitUntilMs
              ? new Date(rateLimitUntilMs).toISOString()
              : null,
          });
          return {
            processed: 0,
            nextSequence: cursor.toString(),
            latestSequence: latestSequence.toString(),
          };
        }

        const built = buildKillmailRows(killmailPackages);
        const {
          missingAllianceIds,
          missingCharacterIds,
          missingCorporationIds,
          missingFactionIds,
          missingWarIds,
        } = built;

        await ctx.run("Ensure related entities exist", async () => {
          await createCorpAndItsRefRecords({
            missingAllianceIds,
            missingCharacterIds,
            missingCorporationIds,
            missingFactionIds,
            missingWarIds,
          });
        });

        const { rows: resolved, droppedKillmailIds } = await ctx.run(
          "Drop unresolvable references",
          async () => dropUnresolvableReferences(built),
        );
        const { killmailRows, victimRows, attackerRows, itemRows } = resolved;

        if (droppedKillmailIds.length > 0) {
          ctx.logger.warn(
            "Skipped killmails referencing rows the SDE has not delivered yet.",
            { killmailIds: droppedKillmailIds },
          );
        }

        await ctx.run("Insert killmail records", async () => {
          // One transaction: a failure part-way through used to leave Killmail
          // rows committed with no victim, attackers or items, and those orphans
          // then looked complete to `skipDuplicates` on the next attempt.
          await prisma.$transaction([
            prisma.killmail.createMany({
              data: killmailRows,
              skipDuplicates: true,
            }),
            prisma.killmailVictim.createMany({
              data: victimRows,
              skipDuplicates: true,
            }),
            prisma.killmailAttacker.createMany({
              data: attackerRows,
              skipDuplicates: true,
            }),
            prisma.killmailVictimItems.createMany({
              data: itemRows,
              skipDuplicates: true,
            }),
          ]);
        });

        await redis.set(R2Z2_CURSOR_KEY, cursor.toString());
        await redis.del(R2Z2_BATCH_FAILURE_KEY);

        const droppedNote =
          droppedKillmailIds.length > 0
            ? ` Skipped ${droppedKillmailIds.length} referencing unknown SDE rows.`
            : "";

        await postUpdateCard({
          status: "success",
          summary: `Processed ${killmailRows.length} killmails.${droppedNote}`,
          processed: killmailRows.length,
          range: formatRange(startCursor, cursor),
          lag: formatLag(latestSequence, cursor),
          latestSequence,
          nextSequence: cursor,
          attackers: attackerRows.length,
          victimItems: itemRows.length,
          throttledUntil: rateLimitUntilMs
            ? new Date(rateLimitUntilMs).toISOString()
            : null,
        });

        return {
          processed: killmailRows.length,
          nextSequence: cursor.toString(),
          latestSequence: latestSequence.toString(),
          attackers: attackerRows.length,
          victimItems: itemRows.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        const quarantined = await quarantineExhaustedBatch(
          ctx,
          redis,
          startCursor,
          cursor,
          message,
        );

        await postUpdateCard({
          status: "failed",
          summary: quarantined
            ? `Error: ${message} — gave up on ${formatRange(startCursor, cursor)} after ${MAX_BATCH_FAILURES} attempts and advanced the cursor.`
            : `Error: ${message}`,
          range: formatRange(startCursor, cursor),
          lag: formatLag(latestSequence, cursor),
          latestSequence,
          nextSequence: cursor,
          throttledUntil: rateLimitUntilMs
            ? new Date(rateLimitUntilMs).toISOString()
            : null,
        });
        throw error;
      }
    },
  });
