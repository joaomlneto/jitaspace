import type { ContractSummary } from "./contract";

/**
 * The Contracts tab of character, corporation and type pages: which contracts
 * a request asks for, shared by the tab and `/api/contracts/history`. The read
 * itself is `readContractHistory` (app/contracts/history.ts).
 */

export const CONTRACT_HISTORY_SUBJECTS = [
  "character",
  "corporation",
  "type",
] as const;
export type ContractHistorySubject = (typeof CONTRACT_HISTORY_SUBJECTS)[number];

export interface ContractHistoryQuery {
  subject: ContractHistorySubject;
  id: number;
  /** Only contracts with a lower id: the last one of the previous page. */
  before: number | null;
}

export interface ContractHistoryPage {
  contracts: ContractSummary[];
  /** Pass as `before` for the next page; null on the last. */
  nextBefore: number | null;
}

/** Contract, character, corporation and type ids are Postgres `integer`s. */
const INT4_MAX = 2_147_483_647;

/** A canonical positive integer that fits an `integer` column, or null. */
function positiveInt(raw: string | null): number | null {
  if (raw === null || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= INT4_MAX ? value : null;
}

export const CONTRACT_HISTORY_PAGE_SIZE = 50;

/** The query parameter naming each subject, as the tab component sends it. */
const PARAM: Record<ContractHistorySubject, string> = {
  character: "characterId",
  corporation: "corporationId",
  type: "typeId",
};

/** The query a request asks for, or null if it names no single subject. */
export function parseContractHistoryQuery(
  params: URLSearchParams,
): ContractHistoryQuery | null {
  const named = CONTRACT_HISTORY_SUBJECTS.filter((subject) =>
    params.has(PARAM[subject]),
  );
  const [subject] = named;
  if (subject === undefined || named.length > 1) return null;
  const id = positiveInt(params.get(PARAM[subject]));
  if (id === null) return null;
  // A cursor that is not a contract id is refused, not read as the first
  // page: the route would cache page one under that URL.
  const rawBefore = params.get("before");
  const before = rawBefore === null ? null : positiveInt(rawBefore);
  if (rawBefore !== null && before === null) return null;
  return { subject, id, before };
}

/** The URL query for one page of a subject's history. */
export function contractHistorySearch(
  subject: ContractHistorySubject,
  id: number,
  before: number | null,
): string {
  const params = new URLSearchParams({ [PARAM[subject]]: `${id}` });
  if (before !== null) params.set("before", `${before}`);
  return params.toString();
}
