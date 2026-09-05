/**
 * `npcCharacters.yaml` is not a list of agents: a few hundred of its records are
 * NPC corporation CEOs, which carry no `agent` block and no `locationID`. The
 * job mapped every record into an Agent row and threw on those, so it failed on
 * every run from the moment it started reading the SDE archive. It still has to
 * create a Character row for all of them, though — a Corporation's `ceoId`
 * points at one.
 *
 * The other thing pinned here is the soft-delete: the SDE-owned tables must
 * fetch their local rows UNSCOPED, or a character CCP deleted from the file
 * outright has no id to be scoped by and its row is never even looked at. The
 * prisma stub below therefore applies `where.characterId.in` for real, so
 * re-narrowing any of those fetches makes the stale-row tests fail.
 */
import type { scrapeSdeAgents as ScrapeSdeAgents } from "../jobs/scrape/sde/scrapeSdeAgents";

jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));
jest.mock("../env", () => ({ env: { NODE_ENV: "test" } }));

const AGENT = {
  locationID: 60000001,
  ancestryID: 12,
  agent: { agentTypeID: 2, divisionID: 18, level: 1, isLocator: false },
};
const RESEARCH_AGENT = {
  locationID: 60000002,
  agent: { agentTypeID: 4, divisionID: 22, level: 3 },
  skills: [{ typeID: 11433 }, { typeID: 11441 }],
};
/** An NPC corporation CEO: no `agent`, and — like all of them — no `locationID`. */
const CEO = { ceo: true, corporationID: 1000001, name: "Some CEO" };

/** A character CCP deleted from npcCharacters.yaml entirely — like 3009966. */
const DELETED_CHARACTER_ID = 3009966;

jest.mock("../helpers/loadSdeFile", () => ({
  loadSdeFile: () =>
    Promise.resolve({ 3009000: AGENT, 3009001: CEO, 3009002: RESEARCH_AGENT }),
}));
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords: () => Promise.resolve(undefined),
}));
jest.mock("../helpers/mergeEntriesIntoCharactersTable", () => ({
  mergeEsiEntriesIntoCharactersTable: (entries: unknown[]) =>
    Promise.resolve({
      created: entries.length,
      modified: 0,
      deleted: 0,
      equal: 0,
    }),
}));
jest.mock("@jitaspace/esi-client", () => ({
  getCharactersDetail: (characterId: number) =>
    Promise.resolve({ data: { name: `NPC ${characterId}` } }),
}));

/** Rows each stubbed table already holds when the job runs. */
const existing: Record<string, Record<string, unknown>[]> = {
  agent: [{ characterId: DELETED_CHARACTER_ID, isDeleted: false }],
  researchAgent: [{ characterId: DELETED_CHARACTER_ID, isDeleted: false }],
  researchAgentSkills: [
    { characterId: DELETED_CHARACTER_ID, typeId: 11433, isDeleted: false },
    // A research agent the SDE STILL lists, holding one CURRENT skill and one
    // it no longer has. Deleting by characterId alone would sweep both; only
    // the stale row may go.
    { characterId: 3009002, typeId: 11433, isDeleted: false },
    { characterId: 3009002, typeId: 99999, isDeleted: false },
  ],
  // One NPC character whose SDE columns are still unset, and one player
  // character ESI owns and this job must never touch.
  character: [
    { characterId: 3009000, ancestryId: null, isUnique: null },
    { characterId: 90000001, ancestryId: null, isUnique: null },
  ],
  npcCharacterSkill: [
    { characterId: DELETED_CHARACTER_ID, typeId: 11433, isDeleted: false },
  ],
};

const created: Record<string, Record<string, unknown>[]> = {};
const updated: Record<string, Record<string, unknown>[]> = {};
const softDeleted: Record<string, Record<string, unknown>[]> = {};

function stub(prisma: any, model: string) {
  created[model] = [];
  updated[model] = [];
  softDeleted[model] = [];
  Object.defineProperty(prisma, model, {
    configurable: true,
    value: {
      // Honours the scope the caller passes, exactly as the database would: a
      // fetch narrowed to ids the SDE still lists cannot see the stale rows.
      findMany: (args: any) => {
        const scope: number[] | undefined = args?.where?.characterId?.in;
        const rows = existing[model]!.filter(
          (row) => !scope || scope.includes(row.characterId as number),
        );
        return Promise.resolve(rows);
      },
      createMany: ({ data }: { data: Record<string, unknown>[] }) => {
        created[model]!.push(...data);
        return Promise.resolve({ count: data.length });
      },
      update: ({ data }: { data: Record<string, unknown> }) => {
        updated[model]!.push(data);
        return Promise.resolve({});
      },
      updateMany: ({ where }: { where: Record<string, unknown> }) => {
        // Single-key tables soft-delete by `characterId in (…)`; the composite
        // helper builds an `OR` of whole keys.
        const ids = (where.characterId as { in?: number[] } | undefined)?.in;
        const rows = ids
          ? existing[model]!.filter((row) =>
              ids.includes(row.characterId as number),
            )
          : ((where.OR ?? []) as Record<string, unknown>[]);
        softDeleted[model]!.push(...rows);
        return Promise.resolve({ count: rows.length });
      },
    },
  });
}

let scrapeSdeAgents: typeof ScrapeSdeAgents;
let stats: Record<string, { created: number; deleted: number }>;

beforeAll(async () => {
  const { prisma } = require("../db") as { prisma: any };
  for (const model of [
    "agent",
    "researchAgent",
    "researchAgentSkills",
    "character",
    "npcCharacterSkill",
  ]) {
    stub(prisma, model);
  }
  scrapeSdeAgents =
    require("../jobs/scrape/sde/scrapeSdeAgents").scrapeSdeAgents;
  ({ stats } = (await scrapeSdeAgents.handler({ payload: {} } as never)) as {
    stats: typeof stats;
  });
});

describe("scrape-sde-agents", () => {
  it("writes an Agent row only for NPC characters that are agents", () => {
    expect(created.agent!.map((row) => row.characterId)).toEqual([
      3009000, 3009002,
    ]);
    // The CEO would have produced `stationId: NaN` from a missing locationID.
    expect(created.agent!.every((row) => Number.isFinite(row.stationId))).toBe(
      true,
    );
    // Every NPC character still becomes a Character, the CEO included.
    expect(stats.characterChanges!.created).toBe(3);
    // Only agentTypeID 4 is a research agent, with its skills.
    expect(created.researchAgent!.map((row) => row.characterId)).toEqual([
      3009002,
    ]);
    // 11433 already exists (see `existing`), so only 11441 is created.
    expect(created.researchAgentSkills!.map((row) => row.typeId)).toEqual([
      11441,
    ]);
  });

  it("stores skills for every skill-bearing NPC character, CEOs included", () => {
    // RESEARCH_AGENT is the only fixture with skills and it is an agent; the
    // point of the table is that a CEO's skills would land here too.
    expect(created.npcCharacterSkill!.map((r) => r.characterId)).toEqual([
      3009002, 3009002,
    ]);
  });

  it("fills the SDE-owned Character columns ESI cannot supply", () => {
    expect(updated.character).toEqual([{ ancestryId: 12, isUnique: null }]);
  });

  it("never soft-deletes a Character, which ESI owns", () => {
    // The one diff that must STAY scoped: the table holds every character we
    // have ever seen, and npcCharacters.yaml says nothing about the players in
    // it. Unscope this fetch and the seeded player row diffs as deleted.
    expect(stats.characterSdeChanges!.deleted).toBe(0);
  });

  it.each([
    ["agent", "agentChanges"],
    ["researchAgent", "researchAgentsChanges"],
    ["researchAgentSkills", "researchAgentSkillChanges"],
    ["npcCharacterSkill", "npcCharacterSkills"],
  ])(
    "soft-deletes the %s row of a character the SDE dropped",
    (model, statsKey) => {
      // 3009966 is in none of the SDE fixtures, so nothing derived from the
      // file can name it. The diff only reaches it if the local fetch is
      // unscoped (or, for the composite table, if the scope is widened with
      // the ids the table already holds) — narrow it again and this fails.
      expect(
        softDeleted[model]!.filter(
          (row) => row.characterId === DELETED_CHARACTER_ID,
        ),
      ).toHaveLength(1);
      expect(stats[statsKey]!.deleted).toBeGreaterThanOrEqual(1);
    },
  );

  it("leaves the rows the SDE still lists alone", () => {
    // The soft-delete must not be a blunt "delete everything not created this
    // run": only rows the SDE dropped may be touched.
    for (const model of Object.keys(softDeleted)) {
      const unexpected = softDeleted[model]!.filter(
        (row) =>
          row.characterId !== DELETED_CHARACTER_ID &&
          !(row.characterId === 3009002 && row.typeId === 99999),
      );
      expect({ model, unexpected }).toEqual({ model, unexpected: [] });
    }
  });

  it("soft-deletes one lost skill without touching its siblings", () => {
    // ResearchAgentSkills is keyed (character, skill), but its delete used to
    // match on characterId alone — so an agent that lost ONE skill had all of
    // them soft-deleted, and the survivors were only repaired on the next run.
    const rows = softDeleted.researchAgentSkills!.filter(
      (row) => row.characterId === 3009002,
    );
    expect(rows.map((row) => row.typeId)).toEqual([99999]);
  });
});
