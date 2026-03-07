import type { Prisma } from "@jitaspace/db";
import { postUpdateCard } from "@jitaspace/chat";
import { prisma } from "@jitaspace/db";
import { GetKillmailsKillmailIdKillmailHash200 } from "@jitaspace/esi-client";
import { redis } from "@jitaspace/kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

const R2Z2_BASE_URL = "https://r2z2.zkillboard.com/ephemeral";
const R2Z2_SEQUENCE_URL = `${R2Z2_BASE_URL}/sequence.json`;
const R2Z2_CURSOR_KEY = "zkillboard:r2z2:next-sequence";
const R2Z2_RATE_LIMIT_UNTIL_KEY = "zkillboard:r2z2:rate-limit-until";
const USER_AGENT = "www.jita.space - Joao Neto - joao@jita.space";
const MAX_KILLMAILS_PER_RUN = 100;
const RATE_LIMIT_FALLBACK_SLEEP_SECONDS = 60;
const RATE_LIMIT_MIN_INTERVAL_MS = 50;
let lastRequestAt = 0;

type ZkbMetadata = {
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
};

type R2Z2Package = {
  killmail_id: number;
  hash: string;
  sequence_id: number;
  uploaded_at: number;
  esi: GetKillmailsKillmailIdKillmailHash200;
  zkb: ZkbMetadata;
};

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
        visit(entry.items as Item[], index);
      }
    }
  };

  if (items && items.length > 0) {
    visit(items, null);
  }

  return flattened;
};

const fetchJson = async (url: string) => {
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

export const scrapeZkillboardRecentKills = client.createFunction(
  {
    id: "scrape-zkillboard-recent-kills",
    name: "Scrape Killmails from R2Z2",
    singleton: {
      key: "scrape-zkillboard-recent-kills",
      mode: "skip",
    },
    retries: 0,
    description: "Poll zKillboard's R2Z2 sequence feed and ingest killmails.",
  },
  {
    /*cron: "TZ=UTC * * * * *"*/
    event: "scrape/zkillboard/recent-kills",
  },
  async ({ step, logger }) => {
    let latestSequence: bigint | null = null;
    let startCursor: bigint | null = null;
    let cursor: bigint | null = null;
    let rateLimitUntilMs: number | null = null;

    try {
      const latestSequenceValue = await step.run(
        "Fetch latest R2Z2 sequence",
        async () => {
          const sequencePayload = await fetchJson(R2Z2_SEQUENCE_URL);
          if (sequencePayload.status === 429) {
            return sequencePayload;
          }
          if (sequencePayload.status === 404 || !sequencePayload.data) {
            throw new Error("R2Z2 sequence.json not available");
          }
          return parseSequenceId(sequencePayload.data);
        },
      );

      if (!latestSequenceValue) {
        throw new Error("Invalid latest sequence value from R2Z2.");
      }

      if (
        typeof latestSequenceValue === "object" &&
        (latestSequenceValue as { status?: number }).status === 429
      ) {
        const retryAfterSeconds = (
          latestSequenceValue as { retryAfterSeconds?: number | null }
        ).retryAfterSeconds;
        rateLimitUntilMs =
          Date.now() +
          (retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS) * 1000;
        await postUpdateCard({
          status: "rate_limited",
          summary: "Rate limited while fetching sequence.json.",
          throttledUntil: new Date(rateLimitUntilMs).toISOString(),
        });
        return {
          processed: 0,
          rateLimited: true,
          retryAfterSeconds: retryAfterSeconds ?? null,
        };
        /*
        const sleepFor = toSleepDuration(retryAfterSeconds);
        rateLimitUntilMs =
          Date.now() +
          (retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SLEEP_SECONDS) * 1000;
        await step.sleep("Rate limited fetching sequence.json", sleepFor);
        await postUpdateCard({
          status: "rate_limited",
          summary: "Rate limited while fetching sequence.json.",
          throttledUntil: new Date(rateLimitUntilMs).toISOString(),
        });*/
      }

      latestSequence = BigInt(latestSequenceValue as string);

      let nextSequenceValue: string | null = await step.run(
        "Load R2Z2 cursor",
        async () => {
          const stored = await redis.get(R2Z2_CURSOR_KEY);
          if (!stored) return null;
          return stored;
        },
      );

      if (nextSequenceValue === null) {
        nextSequenceValue = latestSequenceValue as string;
        await step.run("Initialize R2Z2 cursor", async () => {
          await redis.set(R2Z2_CURSOR_KEY, nextSequenceValue!);
        });
      }

      const killmailPackages: R2Z2Package[] = [];
      cursor = BigInt(nextSequenceValue);
      startCursor = cursor;

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
          await step.sleep("Rate limited fetching killmail", sleepFor);
          break;
        }

        if (response.status === 404) {
          // If we're behind and hit a 404 immediately, re-prime to latest.
          if (killmailPackages.length === 0 && cursor < latestSequence) {
            cursor = latestSequence;
            await redis.set(R2Z2_CURSOR_KEY, cursor.toString());
          }
          break;
        }

        const payload = response.data as Partial<R2Z2Package> | null;
        if (!payload?.esi || !payload.zkb) {
          logger.warn({
            sequence: cursor.toString(),
            message: "Skipping invalid killmail payload from R2Z2.",
          });
          cursor += 1n;
          continue;
        }

        killmailPackages.push(payload as R2Z2Package);
        cursor += 1n;
      }

      if (killmailPackages.length === 0) {
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
          nextSequence: cursor?.toString(),
          latestSequence: latestSequence.toString(),
        };
      }

      const missingAllianceIds = new Set<number>();
      const missingCharacterIds = new Set<number>();
      const missingCorporationIds = new Set<number>();
      const missingFactionIds = new Set<number>();
      const missingWarIds = new Set<number>();

      const killmailRows: Prisma.KillmailCreateManyInput[] = [];
      const victimRows: Prisma.KillmailVictimCreateManyInput[] = [];
      const attackerRows: Prisma.KillmailAttackerCreateManyInput[] = [];
      const itemRows: Prisma.KillmailVictimItemsCreateManyInput[] = [];

      for (const entry of killmailPackages) {
        const killmail = entry.esi;
        const zkb = entry.zkb;
        const hash = zkb.hash;

        const killmailId = toBigInt(killmail.killmail_id);
        const warId = killmail.war_id ?? zkb.war_id ?? null;

        if (warId !== null) missingWarIds.add(warId);

        killmailRows.push({
          killmailId,
          hash,
          killmailTime: new Date(killmail.killmail_time),
          solarSystemId: killmail.solar_system_id,
          moonId: killmail.moon_id ?? null,
          warId: killmail.war_id ?? zkb.war_id ?? null,
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

        const flattenedItems = flattenVictimItems(victim.items);
        flattenedItems.forEach(({ item, parentIndex }, itemIndex) => {
          itemRows.push({
            killmailId,
            itemIndex,
            parentItemIndex: parentIndex,
            flag: item.flag,
            typeId: item.item_type_id,
            quantityDestroyed: item.quantity_destroyed ?? null,
            quantityDropped: item.quantity_dropped ?? null,
            singleton: toBigInt(item.singleton ?? 0),
          });
        });

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
            securityStatus: attacker.security_status ?? 0,
          });
        });

        const add = (set: Set<number>, value?: number) => {
          if (value != null) set.add(value);
        };

        add(missingAllianceIds, victim.alliance_id);
        add(missingCharacterIds, victim.character_id);
        add(missingCorporationIds, victim.corporation_id);
        add(missingFactionIds, victim.faction_id);

        killmail.attackers.forEach((attacker) => {
          add(missingAllianceIds, attacker.alliance_id);
          add(missingCharacterIds, attacker.character_id);
          add(missingCorporationIds, attacker.corporation_id);
          add(missingFactionIds, attacker.faction_id);
        });
      }

      await step.run("Ensure related entities exist", async () => {
        await createCorpAndItsRefRecords({
          missingAllianceIds,
          missingCharacterIds,
          missingCorporationIds,
          missingFactionIds,
          missingWarIds,
        });
      });

      await step.run("Insert killmail records", async () => {
        await prisma.killmail.createMany({
          data: killmailRows,
          skipDuplicates: true,
        });

        await prisma.killmailVictim.createMany({
          data: victimRows,
          skipDuplicates: true,
        });

        await prisma.killmailAttacker.createMany({
          data: attackerRows,
          skipDuplicates: true,
        });

        await prisma.killmailVictimItems.createMany({
          data: itemRows,
          skipDuplicates: true,
        });
      });

      await redis.set(R2Z2_CURSOR_KEY, cursor.toString());

      await postUpdateCard({
        status: "success",
        summary: `Processed ${killmailRows.length} killmails.`,
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
      await postUpdateCard({
        status: "failed",
        summary: `Error: ${message}`,
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
);
