/**
 * Pure pieces of the `esi-sync-public-contracts` job: turning ESI's public
 * contract listings into `Contract` rows, and choosing which auctions to
 * refresh bids for. Kept free of ESI/Prisma runtime imports so they can be
 * unit-tested directly.
 */
import type { ContractsPublicRegionIdGet } from "@jitaspace/esi-client";

export type EsiPublicContract = ContractsPublicRegionIdGet[number];

export type ContractTypeName =
  | "Unknown"
  | "ItemExchange"
  | "Auction"
  | "Courier"
  | "Loan";

const CONTRACT_TYPES: Record<EsiPublicContract["type"], ContractTypeName> = {
  unknown: "Unknown",
  item_exchange: "ItemExchange",
  auction: "Auction",
  courier: "Courier",
  loan: "Loan",
};

/** A type ESI adds later is stored as Unknown, as the EVE Ref import did. */
export const contractTypeOf = (contract: Pick<EsiPublicContract, "type">) =>
  (CONTRACT_TYPES as Partial<Record<string, ContractTypeName>>)[
    contract.type
  ] ?? "Unknown";

/** Only these list items (ESI answers 400 for the others) ... */
export const TYPES_WITH_ITEMS: ReadonlySet<ContractTypeName> = new Set([
  "ItemExchange",
  "Auction",
]);
/** ... and only auctions take bids. */
export const TYPES_WITH_BIDS: ReadonlySet<ContractTypeName> = new Set([
  "Auction",
]);

/** NPC station IDs; anything above is an Upwell structure. */
const isNpcStationId = (id: number) => id >= 60_000_000 && id < 64_000_000;

/**
 * The NPC station a contract is in, or null for one in a player structure.
 * ESI gives only `start_location_id`; EVE Ref's snapshots derived station and
 * system from it the same way.
 */
export const npcStationOf = (contract: EsiPublicContract) =>
  contract.start_location_id != null &&
  isNpcStationId(contract.start_location_id)
    ? contract.start_location_id
    : null;

export interface ContractRow {
  contractId: number;
  type: ContractTypeName;
  issuerId: number;
  issuerCorporationId: number;
  forCorporation: boolean;
  title: string;
  dateIssued: Date;
  dateExpired: Date;
  daysToComplete: number | null;
  volume: number | null;
  startLocationId: bigint | null;
  endLocationId: bigint | null;
  regionId: number;
  solarSystemId: number | null;
  stationId: number | null;
  price: number | null;
  reward: number | null;
  collateral: number | null;
  buyout: number | null;
}

/**
 * A `Contract` row from ESI's listing, stored as ESI reports it (its timeline
 * is the timeline engine's). `stationSystems` maps NPC station IDs to their
 * solar system; contracts in player structures have neither.
 */
export const contractRowFromEsi = (
  contract: EsiPublicContract,
  regionId: number,
  stationSystems: ReadonlyMap<number, number | null>,
): ContractRow => {
  const stationId = npcStationOf(contract);
  return {
    contractId: contract.contract_id,
    type: contractTypeOf(contract),
    issuerId: contract.issuer_id,
    issuerCorporationId: contract.issuer_corporation_id,
    forCorporation: contract.for_corporation ?? false,
    title: contract.title ?? "",
    dateIssued: new Date(contract.date_issued),
    dateExpired: new Date(contract.date_expired),
    daysToComplete: contract.days_to_complete ?? null,
    volume: contract.volume ?? null,
    startLocationId:
      contract.start_location_id == null
        ? null
        : BigInt(contract.start_location_id),
    endLocationId:
      contract.end_location_id == null
        ? null
        : BigInt(contract.end_location_id),
    regionId,
    solarSystemId:
      stationId == null ? null : (stationSystems.get(stationId) ?? null),
    stationId,
    price: contract.price ?? null,
    reward: contract.reward ?? null,
    collateral: contract.collateral ?? null,
    // ESI reports 0 for an auction without one.
    buyout: contract.buyout === 0 ? null : (contract.buyout ?? null),
  };
};

/** Auctions this close to expiry get their bids refreshed on every run. */
export const BIDS_HOT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Every other auction is refreshed once per this many runs. */
export const BIDS_COLD_EVERY_RUNS = 12;
/** The job's cadence, which the cold rotation counts in. */
export const RUN_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Which outstanding auctions to fetch bids for this run: new ones, the ones
 * expiring within {@link BIDS_HOT_WINDOW_MS} (bids cluster at the end), and a
 * 1/{@link BIDS_COLD_EVERY_RUNS} rotation of the rest, so every auction is
 * refreshed at least every 6 hours. The rotation is keyed on the contract ID and
 * the half-hour slot, so a retry within the slot picks the same set.
 */
export const selectAuctionsForBids = (
  auctions: readonly { contractId: number; dateExpired: number }[],
  newIds: ReadonlySet<number>,
  now: number,
) => {
  const slot = Math.floor(now / RUN_INTERVAL_MS) % BIDS_COLD_EVERY_RUNS;
  return auctions
    .filter(
      (a) =>
        newIds.has(a.contractId) ||
        a.dateExpired - now <= BIDS_HOT_WINDOW_MS ||
        a.contractId % BIDS_COLD_EVERY_RUNS === slot,
    )
    .map((a) => a.contractId);
};
