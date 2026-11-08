import type { AuthenticatedContract } from "@jitaspace/hooks";

/**
 * One contract, in the shape every contract view renders.
 *
 * Contracts reach the site two ways: public ones from our database (the
 * snapshots `/api/contracts/open/[shard]` serves) and the authenticated characters' own
 * from ESI (`useAuthenticatedContracts`). Both are turned into this before
 * anything renders them, so a card or a row never needs to know which. Fields
 * only one source carries are optional, and names the database already knows
 * travel with the ids so the page needs no ESI lookup for them.
 *
 * Plain JSON (ISO dates, no BigInt): it crosses the API route.
 */
export interface ContractSummary {
  contractId: number;
  type: ContractKind;
  title: string;
  issuerId: number;
  issuerName?: string | null;
  issuerCorporationId: number;
  issuerCorporationName?: string | null;
  /** Issued on behalf of the issuer's corporation. */
  forCorporation: boolean;
  dateIssued: string;
  dateExpired: string;
  daysToComplete: number | null;
  /** m³, for couriers and item exchanges. */
  volume: number | null;
  price: number | null;
  reward: number | null;
  collateral: number | null;
  buyout: number | null;
  start: ContractLocation | null;
  /** Only a courier's differs from `start` in practice. */
  end: ContractLocation | null;
  regionId: number | null;
  regionName?: string | null;

  /** ESI only: the database holds public contracts, whose status it infers. */
  status?: string;
  /** ESI only: public, personal, corporation or alliance. */
  availability?: string;
  assigneeId?: number;
  acceptorId?: number;

  /** Database only: the listing carries no item summary. */
  items?: ContractItemSummary;
  /** Database only: bids we have recorded, and the highest of them. */
  bidCount?: number;
  highestBid?: number | null;
  /** Database only: the last snapshot that listed the contract. */
  lastSeenAt?: string | null;
  /** Database only: false once the public listing stopped showing it. */
  isOpen?: boolean;
}

export type ContractKind =
  | "item_exchange"
  | "auction"
  | "courier"
  | "loan"
  | "unknown";

export interface ContractLocation {
  locationId: number;
  kind: "station" | "structure" | "other";
  name?: string | null;
  solarSystemId?: number | null;
  solarSystemName?: string | null;
  securityStatus?: number | null;
}

export interface ContractItemSummary {
  /** Item lines the issuer offers (not the ones they ask for). */
  count: number;
  /** The first offered item, which names the contract when it has no title. */
  first: {
    typeId: number;
    name?: string | null;
    quantity: number;
    /** See typeImageVariation. */
    imageVariation?: string;
  } | null;
}

/** The SDE category every blueprint type belongs to. */
export const BLUEPRINT_CATEGORY_ID = 9;

/**
 * Which image the type server has for an item, when we know better than its
 * default. Blueprints have no `icon`: asking for one is a 400 before the
 * avatar falls back to `bp`/`bpc`, so a page of blueprints logged a console
 * error each. Undefined lets the avatar use its default.
 */
export function typeImageVariation(
  isBlueprint: boolean,
  isBlueprintCopy: boolean | null | undefined,
): string | undefined {
  if (!isBlueprint) return undefined;
  return isBlueprintCopy ? "bpc" : "bp";
}

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = {
  item_exchange: "Item Exchange",
  auction: "Auction",
  courier: "Courier",
  loan: "Loan",
  unknown: "Unknown",
};

/** NPC station ids sit in this range; Upwell structure ids are ~10¹². */
const STATION_ID_MIN = 60_000_000;
const STATION_ID_MAX = 64_000_000;
const STRUCTURE_ID_MIN = 1_000_000_000_000;

export function locationKind(locationId: number): ContractLocation["kind"] {
  if (locationId >= STATION_ID_MIN && locationId < STATION_ID_MAX) {
    return "station";
  }
  if (locationId >= STRUCTURE_ID_MIN) return "structure";
  return "other";
}

/** ESI reports 0 for amounts a contract does not use. */
function amount(value: number | undefined): number | null {
  return value === undefined || value === 0 ? null : value;
}

function esiLocation(locationId: number | undefined): ContractLocation | null {
  if (!locationId) return null;
  return { locationId, kind: locationKind(locationId) };
}

export function fromEsiContract(
  contract: AuthenticatedContract,
): ContractSummary {
  return {
    contractId: contract.contract_id,
    type: contract.type,
    title: contract.title ?? "",
    issuerId: contract.issuer_id,
    issuerCorporationId: contract.issuer_corporation_id,
    forCorporation: contract.for_corporation,
    dateIssued: contract.date_issued,
    dateExpired: contract.date_expired,
    daysToComplete: contract.days_to_complete ?? null,
    volume: contract.volume ?? null,
    price: amount(contract.price),
    reward: amount(contract.reward),
    collateral: amount(contract.collateral),
    buyout: amount(contract.buyout),
    start: esiLocation(contract.start_location_id),
    end: esiLocation(contract.end_location_id),
    regionId: null,
    status: contract.status,
    availability: contract.availability,
    assigneeId: contract.assignee_id || undefined,
    acceptorId: contract.acceptor_id || undefined,
  };
}

/**
 * The ISK the acceptor pays (positive) or receives (negative), as the in-game
 * contract list shows it: a courier pays its reward, a "want to buy" item
 * exchange pays its reward, an auction costs its highest bid or starting price.
 */
export function contractHeadlineIsk(contract: ContractSummary): {
  label: string;
  amount: number | null;
} {
  switch (contract.type) {
    case "courier":
      return { label: "Reward", amount: contract.reward };
    case "auction":
      return contract.highestBid
        ? { label: "Current bid", amount: contract.highestBid }
        : { label: "Starting bid", amount: contract.price };
    default:
      if (!contract.price && contract.reward) {
        return { label: "Reward", amount: contract.reward };
      }
      return { label: "Price", amount: contract.price };
  }
}
