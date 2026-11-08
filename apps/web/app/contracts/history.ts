import type {
  ContractHistoryPage,
  ContractHistoryQuery,
} from "~/components/Contracts/history";
import { CONTRACT_HISTORY_PAGE_SIZE } from "~/components/Contracts/history";
import { Prisma, prisma } from "~/lib/db";
import {
  contractSummarySelect,
  readPageExtras,
  toContractSummary,
} from "./data";

/**
 * Every public contract one character, corporation or type appears in, ended
 * or open: the Contracts tab of their pages.
 *
 * Newest first, a page at a time, by contract id (ids rise with issue time).
 * A page asks for the ids below the last one shown, so each reads one range of
 * an `(…, contractId)` index, however far back it is. An offset, or ordering
 * by issue date, would make the planner walk the whole primary key backwards
 * for an entity whose contracts are old or few.
 */

/** One more than a page, to know whether another follows. */
function pageIds({ subject, id, before }: ContractHistoryQuery) {
  const limit = CONTRACT_HISTORY_PAGE_SIZE + 1;
  const below =
    before === null ? Prisma.empty : Prisma.sql`AND "contractId" < ${before}`;
  if (subject === "type") {
    // A contract may list a type on several lines; each is a contract once.
    return prisma.$queryRaw<{ contractId: number }[]>`
      SELECT DISTINCT "contractId" FROM "ContractItem"
      WHERE "typeId" = ${id} ${below}
      ORDER BY "contractId" DESC
      LIMIT ${limit}`;
  }
  const column =
    subject === "character"
      ? Prisma.raw(`"issuerId"`)
      : Prisma.raw(`"issuerCorporationId"`);
  return prisma.$queryRaw<{ contractId: number }[]>`
    SELECT "contractId" FROM "Contract"
    WHERE ${column} = ${id} ${below}
    ORDER BY "contractId" DESC
    LIMIT ${limit}`;
}

/**
 * One page of a subject's contracts. Not cached here: `/api/contracts/history`
 * serves it behind CDN cache headers.
 */
export async function readContractHistory(
  query: ContractHistoryQuery,
): Promise<ContractHistoryPage> {
  const found = await pageIds(query);
  const ids = found
    .slice(0, CONTRACT_HISTORY_PAGE_SIZE)
    .map((row) => row.contractId);
  if (ids.length === 0) return { contracts: [], nextBefore: null };

  const rows = await prisma.contract.findMany({
    where: { contractId: { in: ids } },
    select: contractSummarySelect,
  });
  const byId = new Map(rows.map((row) => [row.contractId, row]));
  const ordered = ids.flatMap((id) => byId.get(id) ?? []);
  const extras = await readPageExtras(ordered);
  return {
    contracts: ordered.map((row) => toContractSummary(row, extras)),
    nextBefore:
      found.length > CONTRACT_HISTORY_PAGE_SIZE ? (ids.at(-1) ?? null) : null,
  };
}
