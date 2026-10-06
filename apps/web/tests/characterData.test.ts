/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as DataModule from "../app/character/[characterId]/data";
import {
  formatDays,
  summarizeEmployment,
  toStints,
} from "~/app/character/[characterId]/employment";

jest.mock("next/cache", () => ({ cacheLife: jest.fn(), cacheTag: jest.fn() }));

const fn = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPrisma = {
  character: { findUnique: fn() },
  ancestry: { findUnique: fn() },
  dungeon: { findUnique: fn() },
};
jest.mock("~/lib/db", () => ({ prisma: mockPrisma }));

const loadData = () =>
  require("../app/character/[characterId]/data") as typeof DataModule;

const decimal = (value: number) => ({ toNumber: () => value });

const row = (overrides: Record<string, unknown> = {}) => ({
  name: "Agent Smith",
  corporationId: 1000035,
  corporation: { name: "Caldari Navy" },
  raceId: 1,
  race: { name: "Caldari" },
  bloodlineId: 2,
  bloodline: { name: "Civire" },
  ancestryId: null,
  factionId: null,
  faction: null,
  gender: "male",
  title: null,
  description: null,
  securityStatus: null,
  isUnique: null,
  CorporationCeo: [],
  createdCorporations: [],
  Agent: null,
  researchAgents: [],
  ...overrides,
});

beforeEach(() => {
  for (const model of Object.values(mockPrisma)) {
    for (const mock of Object.values(model)) mock.mockReset();
  }
});

describe("readCharacterRecord", () => {
  it("is null for a character we have not stored", async () => {
    mockPrisma.character.findUnique.mockResolvedValue(null);
    await expect(loadData().readCharacterRecord(90000001)).resolves.toBe(null);
  });

  it("maps a plain character, without agent or ancestry queries", async () => {
    mockPrisma.character.findUnique.mockResolvedValue(
      row({
        factionId: 500001,
        faction: { name: "Caldari State" },
        CorporationCeo: [{ corporationId: 2, name: "Zulu" }],
        createdCorporations: [
          { corporationId: 4, name: "Bravo" },
          { corporationId: 3, name: "Alpha" },
        ],
      }),
    );
    const record = await loadData().readCharacterRecord(3000001);
    expect(record).toMatchObject({
      name: "Agent Smith",
      corporation: { id: 1000035, name: "Caldari Navy" },
      faction: { id: 500001, name: "Caldari State" },
      ancestry: null,
      agent: null,
      ceoOf: [{ id: 2, name: "Zulu" }],
      founded: [
        { id: 3, name: "Alpha" },
        { id: 4, name: "Bravo" },
      ],
    });
    expect(mockPrisma.ancestry.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.dungeon.findUnique).not.toHaveBeenCalled();
  });

  it("maps an agent in space with its research fields and ancestry", async () => {
    mockPrisma.character.findUnique.mockResolvedValue(
      row({
        ancestryId: 7,
        Agent: {
          agentTypeId: 4,
          AgentType: { name: "ResearchAgent" },
          agentDivisionId: 22,
          AgentDivision: { name: "distribution", displayName: null },
          level: 4,
          isLocator: true,
          isCeo: false,
          startDate: new Date("2003-03-12T20:04:00Z"),
          station: {
            stationId: 60003760,
            name: "Jita IV - Moon 4",
            solarSystem: {
              solarSystemId: 30000142,
              name: "Jita",
              securityStatus: decimal(0.95),
              constellation: {
                regionId: 10000002,
                region: { name: "The Forge" },
              },
            },
          },
          agentsInSpace: [
            {
              dungeonId: 4000,
              solarSystemId: 30000144,
              solarSystem: { name: "Perimeter" },
              typeId: 12345,
              type: { name: "Command Post" },
            },
          ],
        },
        researchAgents: [
          {
            skills: [
              { typeId: 2, skill: { name: "Zoology" } },
              { typeId: 1, skill: { name: "Astrometrics" } },
            ],
          },
        ],
      }),
    );
    mockPrisma.ancestry.findUnique.mockResolvedValue({ name: "Mercs" });
    mockPrisma.dungeon.findUnique.mockResolvedValue({ name: "Hidden Outpost" });

    const record = await loadData().readCharacterRecord(3019582);
    expect(record?.ancestry).toEqual({ id: 7, name: "Mercs" });
    expect(record?.agent).toMatchObject({
      agentType: { id: 4, name: "ResearchAgent" },
      // No display name: the division's own name stands in.
      division: { id: 22, name: "distribution" },
      startDate: "2003-03-12T20:04:00.000Z",
      station: { securityStatus: 0.95, regionName: "The Forge" },
      inSpace: {
        dungeon: { id: 4000, name: "Hidden Outpost" },
        solarSystem: { id: 30000144, name: "Perimeter" },
        type: { id: 12345, name: "Command Post" },
      },
      researchSkills: [
        { id: 1, name: "Astrometrics" },
        { id: 2, name: "Zoology" },
      ],
    });
  });
});

describe("loadCharacterRecord", () => {
  it("reports a database failure instead of throwing", async () => {
    mockPrisma.character.findUnique.mockRejectedValue(new Error("down"));
    await expect(loadData().loadCharacterRecord(90000001)).resolves.toEqual({
      ok: false,
    });
  });
});

describe("employment history", () => {
  const history = [
    { record_id: 3, corporation_id: 1, start_date: "2020-01-01T00:00:00Z" },
    { record_id: 1, corporation_id: 1, start_date: "2010-01-01T00:00:00Z" },
    {
      record_id: 2,
      corporation_id: 2,
      start_date: "2012-01-01T00:00:00Z",
      is_deleted: true,
    },
  ];

  it("orders stints newest first and measures each", () => {
    const stints = toStints(history, "2021-01-01T00:00:00Z");
    expect(stints.map((s) => s.recordId)).toEqual([3, 2, 1]);
    expect(stints[0]).toMatchObject({ isCurrent: true, end: null });
    expect(stints[1]).toMatchObject({
      end: "2020-01-01T00:00:00Z",
      isClosed: true,
    });
    expect(Math.round(stints[0]!.days)).toBe(366);
    // Without a "now", the current stint has no length yet.
    expect(toStints(history, null)[0]?.days).toBe(0);
  });

  it("summarizes corporations, tenure and the longest stint", () => {
    const summary = summarizeEmployment(
      toStints(history, "2021-01-01T00:00:00Z"),
    );
    expect(summary).toMatchObject({ stints: 3, corporations: 2 });
    expect(summary.current?.recordId).toBe(3);
    expect(summary.longest?.recordId).toBe(2);
    expect(summarizeEmployment([])).toMatchObject({
      stints: 0,
      current: null,
      longest: null,
      averageDays: null,
    });
  });

  it("formats lengths in their largest whole unit", () => {
    expect(formatDays(800)).toBe("2 years");
    expect(formatDays(365)).toBe("1 year");
    expect(formatDays(45)).toBe("1 month");
    expect(formatDays(1.5)).toBe("1 day");
    expect(formatDays(0)).toBe("0 days");
  });
});
