import type {
  ContractKind,
  ContractLocation,
  ContractSummary,
} from "./contract";
import { locationKind, typeImageVariation } from "./contract";

/**
 * Every open public contract, as `/api/contracts/open` sends them and the
 * contracts browser filters, sorts and searches them in the browser.
 *
 * About 50k contracts and 350k item lines are open at a time. Each contract
 * is one tuple, and the names its ids need travel once, in dictionaries: ~12
 * MB of JSON. Vercel lets a function answer at most 4.5 MB and its CDN cache
 * at most 10 MB, so the route sends it gzipped (~2.5 MB), and the browser
 * inflates it as it would any gzipped response.
 *
 * It is one response rather than shards on purpose: shards would be read and
 * cached at different times, so a page could join contracts from different
 * syncs. One response is one read, in one transaction, cached once.
 */

/** The kinds the public listing holds, in tuple order. */
export const SNAPSHOT_KINDS = [
  "item_exchange",
  "auction",
  "courier",
] as const satisfies readonly ContractKind[];

/** Item line flags: asked of the acceptor rather than offered. */
export const ITEM_ASKED = 1;
/** Item line flags: a blueprint copy. */
export const ITEM_COPY = 2;

/** One open contract. Amounts a contract does not use are null, not 0. */
export type SnapshotContract = [
  contractId: number,
  /** Index into SNAPSHOT_KINDS. */
  kind: number,
  title: string,
  issuerId: number,
  issuerCorporationId: number,
  /** 1 if issued on behalf of the corporation. */
  forCorporation: 0 | 1,
  /** Seconds since the epoch. */
  issued: number,
  expires: number,
  daysToComplete: number | null,
  volume: number | null,
  price: number | null,
  reward: number | null,
  collateral: number | null,
  buyout: number | null,
  regionId: number,
  startLocationId: number | null,
  startSystemId: number | null,
  endLocationId: number | null,
  highestBid: number | null,
  bidCount: number,
  /** Flat triples: typeId, quantity, flags (ITEM_ASKED | ITEM_COPY). */
  items: number[],
];

export interface OpenContractsSnapshot {
  /** The latest public listing these contracts come from, or null if none. */
  snapshotAt: string | null;
  /**
   * The listing is over two days old as of this read: the archive import is
   * still catching up. Decided on the server, where reading the clock is free.
   */
  isBackfilling: boolean;
  contracts: SnapshotContract[];
  characters: Record<string, string>;
  corporations: Record<string, string>;
  regions: Record<string, string>;
  /** Name, and 1 for a blueprint (whose image the server has as bp/bpc). */
  types: Record<string, [name: string, isBlueprint: 0 | 1]>;
  /** Name and security status. */
  systems: Record<string, [name: string, securityStatus: number]>;
  /** NPC stations: name and solar system. */
  stations: Record<string, [name: string, solarSystemId: number | null]>;
}

/** An open contract ready to filter: the summary the views render, plus its search text. */
export interface OpenContract {
  contract: ContractSummary;
  /** Lower-case title and item names, which the search box matches. */
  search: string;
  /** Every type the contract offers or asks for. */
  typeIds: number[];
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

/** Turns the snapshot into contracts the views can render. */
export function decodeOpenContracts(
  snapshot: OpenContractsSnapshot,
): OpenContract[] {
  const system = (systemId: number | null | undefined) => {
    const entry =
      systemId === null || systemId === undefined
        ? undefined
        : snapshot.systems[systemId];
    return {
      solarSystemId: systemId ?? null,
      solarSystemName: entry?.[0] ?? null,
      securityStatus: entry?.[1] ?? null,
    };
  };

  return snapshot.contracts.map((row) => {
    const [
      contractId,
      kind,
      title,
      issuerId,
      issuerCorporationId,
      forCorporation,
      issued,
      expires,
      daysToComplete,
      volume,
      price,
      reward,
      collateral,
      buyout,
      regionId,
      startId,
      startSystemId,
      endId,
      highestBid,
      bidCount,
      items,
    ] = row;

    const start: ContractLocation | null =
      startId === null
        ? null
        : {
            locationId: startId,
            kind: locationKind(startId),
            name: snapshot.stations[startId]?.[0] ?? null,
            ...system(startSystemId),
          };
    let end: ContractLocation | null = null;
    if (endId !== null) {
      if (endId === startId) {
        end = start;
      } else {
        const station = snapshot.stations[endId];
        end = {
          locationId: endId,
          kind: locationKind(endId),
          ...(station ? { name: station[0], ...system(station[1]) } : {}),
        };
      }
    }

    const names: string[] = [title.toLowerCase()];
    const typeIds: number[] = [];
    let first: NonNullable<ContractSummary["items"]>["first"] = null;
    let offered = 0;
    for (let index = 0; index + 2 < items.length; index += 3) {
      const typeId = items[index] ?? 0;
      const quantity = items[index + 1] ?? 0;
      const flags = items[index + 2] ?? 0;
      const type = snapshot.types[typeId];
      typeIds.push(typeId);
      if (type) names.push(type[0].toLowerCase());
      if (flags & ITEM_ASKED) continue;
      offered += 1;
      first ??= {
        typeId,
        name: type?.[0] ?? null,
        quantity,
        imageVariation: typeImageVariation(
          type?.[1] === 1,
          (flags & ITEM_COPY) !== 0,
        ),
      };
    }

    const contract: ContractSummary = {
      contractId,
      type: SNAPSHOT_KINDS[kind] ?? "unknown",
      title,
      issuerId,
      issuerName: snapshot.characters[issuerId] ?? null,
      issuerCorporationId,
      issuerCorporationName: snapshot.corporations[issuerCorporationId] ?? null,
      forCorporation: forCorporation === 1,
      dateIssued: iso(issued),
      dateExpired: iso(expires),
      daysToComplete,
      volume,
      price,
      reward,
      collateral,
      buyout,
      start,
      end,
      regionId,
      regionName: snapshot.regions[regionId] ?? null,
      items: { count: offered, first },
      bidCount,
      highestBid,
      isOpen: true,
    };
    return { contract, search: names.join("\n"), typeIds };
  });
}
