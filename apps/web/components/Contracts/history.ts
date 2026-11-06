import type { ContractSummary } from "./contract";
import { positiveInt } from "./filters";

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
  return {
    subject,
    id,
    before: positiveInt(params.get("before")),
  };
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
