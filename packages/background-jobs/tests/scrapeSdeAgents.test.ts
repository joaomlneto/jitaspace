import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { SdeRecord } from "@jitaspace/sde-utils";

import type { scrapeSdeAgents as ScrapeSdeAgents } from "../jobs/scrape/sde/scrapeSdeAgents";
import * as sdeFields from "../helpers/sdeFields";

// @swc/jest doesn't hoist jest.mock, so the mocks are declared first and the
// factories close over them; the job is imported lazily in beforeAll.
const loadSdeFile = jest.fn<(name: string) => Promise<SdeRecord>>();
const mergeEsiEntriesIntoCharactersTable = jest.fn<() => Promise<unknown>>();
const createCorpAndItsRefRecords = jest.fn<() => Promise<unknown>>();
const getCharactersDetail =
  jest.fn<(id: number) => Promise<{ data: object }>>();
const agentCreateMany =
  jest.fn<(args: { data: unknown[] }) => Promise<unknown>>();
const findMany =
  jest.fn<
    (args?: {
      where?: { characterId?: { in?: number[] } };
    }) => Promise<unknown[]>
  >();
const updateMany = jest.fn<() => Promise<unknown>>();

const delegate = () => ({
  findMany,
  createMany: agentCreateMany,
  updateMany,
  update: jest.fn(),
});

jest.mock("../db", () => ({
  prisma: {
    agent: delegate(),
    researchAgent: { ...delegate(), createMany: jest.fn() },
    researchAgentSkills: { ...delegate(), createMany: jest.fn() },
  },
}));
jest.mock("../helpers", () => ({
  loadSdeFile,
  mergeEsiEntriesIntoCharactersTable,
  optionalBoolean: sdeFields.optionalBoolean,
  optionalNumber: sdeFields.optionalNumber,
  optionalSdeDate: sdeFields.optionalSdeDate,
  requiredNumber: sdeFields.requiredNumber,
}));
jest.mock("../helpers/createCorpAndItsRefs.ts", () => ({
  createCorpAndItsRefRecords,
}));
jest.mock("@jitaspace/esi-client", () => ({ getCharactersDetail }));
jest.mock("p-limit", () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

let scrapeSdeAgents: typeof ScrapeSdeAgents;

beforeAll(async () => {
  ({ scrapeSdeAgents } = await import("../jobs/scrape/sde/scrapeSdeAgents"));
});

const AGENT = {
  locationID: 60000001,
  agent: { agentTypeID: 2, divisionID: 4, level: 1 },
};
/** npcCharacters.yaml covers every NPC character; non-agents carry no `agent`. */
const NOT_AN_AGENT = { locationID: 60000001 };

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
  updateMany.mockResolvedValue({});
  agentCreateMany.mockResolvedValue({});
  createCorpAndItsRefRecords.mockResolvedValue(undefined);
  mergeEsiEntriesIntoCharactersTable.mockResolvedValue({});
  getCharactersDetail.mockResolvedValue({ data: {} });
});

describe("scrape-sde-agents", () => {
  it("skips NPC characters that have no agent block instead of aborting", async () => {
    // Regression guard. The required-field check reads a missing `agent`
    // container as corrupt data (optionalNumber(undefined) === null) and
    // throws, which fails the job and aborts bootstrap-database. A real SDE
    // holds hundreds of these: an end-to-end run saw 11,325 NPC characters
    // yield 10,897 agents.
    loadSdeFile.mockResolvedValue({
      3008416: AGENT,
      3008417: NOT_AN_AGENT,
    });

    await expect(
      scrapeSdeAgents.handler(
        {} as Parameters<typeof scrapeSdeAgents.handler>[0],
      ),
    ).resolves.toBeDefined();

    const written = agentCreateMany.mock.calls.flatMap((c) => c[0].data) as {
      characterId: number;
    }[];
    expect(written.map((row) => row.characterId)).toEqual([3008416]);
  });

  it("still rejects a record whose agent block is missing required fields", async () => {
    // The filter must not swallow genuinely corrupt data: an `agent` block that
    // exists but lacks agentTypeID/divisionID/level is still an error.
    loadSdeFile.mockResolvedValue({
      3008418: { locationID: 60000001, agent: { divisionID: 4 } },
    });

    await expect(
      scrapeSdeAgents.handler(
        {} as Parameters<typeof scrapeSdeAgents.handler>[0],
      ),
    ).rejects.toThrow(/missing required SDE fields/);
  });

  it("keeps the full NPC id list as the soft-delete scope", async () => {
    // A character that LOSES its agent block must have its existing row marked
    // deleted, so the scope query must still cover the filtered-out ids.
    loadSdeFile.mockResolvedValue({
      3008416: AGENT,
      3008417: NOT_AN_AGENT,
    });

    await scrapeSdeAgents.handler(
      {} as Parameters<typeof scrapeSdeAgents.handler>[0],
    );

    const scope = findMany.mock.calls[0]?.[0];
    expect(scope?.where?.characterId?.in).toEqual([3008416, 3008417]);
  });
});
