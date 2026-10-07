import { describe, expect, it } from "@jest/globals";

import type { IncursionsGet } from "@jitaspace/esi-client";

import type {
  IncursionSnapshot,
  TrackedIncursion,
} from "../helpers/planIncursionUpdates";
import {
  isObservedFromStart,
  planIncursionUpdates,
  RESUME_WINDOW_MS,
  toIncursionSnapshot,
} from "../helpers/planIncursionUpdates";

const SANSHA = 500019;
const NOW = new Date("2026-10-06T16:15:00Z");
const EARLIER = new Date("2026-10-06T12:00:00Z");

const snapshot = (
  overrides: Partial<IncursionSnapshot> = {},
): IncursionSnapshot => ({
  constellationId: 20000197,
  factionId: SANSHA,
  type: "Incursion",
  stagingSolarSystemId: 30001354,
  state: "established",
  influence: 1,
  hasBoss: false,
  infestedSolarSystemIds: [30001350, 30001351, 30001354],
  ...overrides,
});

const tracked = (
  overrides: Partial<TrackedIncursion> = {},
): TrackedIncursion => ({
  ...snapshot(),
  incursionId: 1,
  endedAt: null,
  establishedAt: EARLIER,
  mobilizingAt: null,
  withdrawingAt: null,
  ...overrides,
});

describe("toIncursionSnapshot", () => {
  it("keeps every field ESI returns, with systems sorted and deduplicated", () => {
    const esi: IncursionsGet[number] = {
      constellation_id: 20000396,
      faction_id: SANSHA,
      has_boss: true,
      infested_solar_systems: [30002708, 30002706, 30002708],
      influence: 0.25,
      staging_solar_system_id: 30002708,
      state: "mobilizing",
      type: "Incursion",
    };
    expect(toIncursionSnapshot(esi)).toEqual({
      constellationId: 20000396,
      factionId: SANSHA,
      type: "Incursion",
      stagingSolarSystemId: 30002708,
      state: "mobilizing",
      influence: 0.25,
      hasBoss: true,
      infestedSolarSystemIds: [30002706, 30002708],
    });
  });
});

describe("planIncursionUpdates", () => {
  it("creates an unseen incursion with an `appeared` event and its state's timestamp", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot()],
      tracked: [],
      now: NOW,
    });
    expect(plan.created).toEqual([
      {
        snapshot: snapshot(),
        stateTimestamps: { establishedAt: NOW },
        events: [
          {
            kind: "appeared",
            state: "established",
            influence: 1,
            hasBoss: false,
            stagingSolarSystemId: 30001354,
          },
        ],
      },
    ]);
    expect(plan.matched).toEqual([]);
    expect(plan.ended).toEqual([]);
  });

  it("matches an unchanged incursion with no events", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot()],
      tracked: [tracked()],
      now: NOW,
    });
    expect(plan.created).toEqual([]);
    expect(plan.matched).toEqual([
      {
        incursionId: 1,
        snapshot: snapshot(),
        resumed: false,
        stateTimestamps: {},
        addedSolarSystemIds: [],
        removedSolarSystemIds: [],
        events: [],
        typeChanged: false,
      },
    ]);
  });

  it("records one event per changed field", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [
        snapshot({
          state: "mobilizing",
          influence: 0.4,
          hasBoss: true,
          stagingSolarSystemId: 30001350,
          infestedSolarSystemIds: [30001350, 30001352, 30001354],
        }),
      ],
      tracked: [tracked()],
      now: NOW,
    });
    const [match] = plan.matched;
    expect(match?.stateTimestamps).toEqual({ mobilizingAt: NOW });
    expect(match?.addedSolarSystemIds).toEqual([30001352]);
    expect(match?.removedSolarSystemIds).toEqual([30001351]);
    expect(match?.events).toEqual([
      {
        kind: "state_changed",
        previousState: "established",
        state: "mobilizing",
      },
      { kind: "influence_changed", previousInfluence: 1, influence: 0.4 },
      { kind: "boss_appeared", hasBoss: true },
      {
        kind: "staging_system_changed",
        previousStagingSolarSystemId: 30001354,
        stagingSolarSystemId: 30001350,
      },
      { kind: "system_added", solarSystemId: 30001352 },
      { kind: "system_removed", solarSystemId: 30001351 },
    ]);
  });

  it("reports a boss going away", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ hasBoss: false })],
      tracked: [tracked({ hasBoss: true })],
      now: NOW,
    });
    expect(plan.matched[0]?.events).toEqual([
      { kind: "boss_disappeared", hasBoss: false },
    ]);
  });

  it("keeps the first time a state was seen", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ state: "mobilizing" })],
      tracked: [tracked({ state: "withdrawing", mobilizingAt: EARLIER })],
      now: NOW,
    });
    expect(plan.matched[0]?.stateTimestamps).toEqual({});
  });

  it("ends an active incursion ESI no longer lists, recording its last state", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ constellationId: 20000001 })],
      tracked: [tracked({ state: "withdrawing", influence: 0.1 })],
      now: NOW,
    });
    expect(plan.ended).toEqual([
      {
        incursionId: 1,
        events: [
          {
            kind: "ended",
            state: "withdrawing",
            influence: 0.1,
            hasBoss: false,
          },
        ],
      },
    ]);
  });

  it("does not end an incursion that has already ended", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [],
      tracked: [tracked({ endedAt: new Date(NOW.getTime() - 60_000) })],
      now: NOW,
    });
    expect(plan.ended).toEqual([]);
  });

  it("resumes an incursion that ended within the resume window", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ influence: 0.9 })],
      tracked: [tracked({ endedAt: new Date(NOW.getTime() - 5 * 60_000) })],
      now: NOW,
    });
    expect(plan.created).toEqual([]);
    expect(plan.matched[0]?.resumed).toBe(true);
    expect(plan.matched[0]?.events).toEqual([
      { kind: "resumed" },
      { kind: "influence_changed", previousInfluence: 1, influence: 0.9 },
    ]);
  });

  it("starts a new incursion where one ended longer ago than the window", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot()],
      tracked: [
        tracked({ endedAt: new Date(NOW.getTime() - RESUME_WINDOW_MS - 1) }),
      ],
      now: NOW,
    });
    expect(plan.created).toHaveLength(1);
    expect(plan.matched).toEqual([]);
  });

  it("treats a different faction in the same constellation as a new incursion", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ factionId: 500020 })],
      tracked: [tracked()],
      now: NOW,
    });
    expect(plan.created).toHaveLength(1);
    expect(plan.ended.map((e) => e.incursionId)).toEqual([1]);
  });

  it("keeps only the first of two entries for one constellation", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot(), snapshot({ influence: 0.5 })],
      tracked: [],
      now: NOW,
    });
    expect(plan.created).toHaveLength(1);
    expect(plan.created[0]?.snapshot.influence).toBe(1);
    expect(plan.duplicates).toEqual([snapshot({ influence: 0.5 })]);
  });

  it("ignores a response listing nothing while incursions are active", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [],
      tracked: [tracked()],
      now: NOW,
    });
    expect(plan.emptyResponseIgnored).toBe(true);
    expect(plan.ended).toEqual([]);
    expect(plan.created).toEqual([]);
  });

  it("ends the newer of two active rows for one constellation", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot()],
      tracked: [tracked({ incursionId: 7 }), tracked({ incursionId: 3 })],
      now: NOW,
    });
    expect(plan.matched.map((m) => m.incursionId)).toEqual([3]);
    expect(plan.ended).toEqual([
      {
        incursionId: 7,
        events: [
          { kind: "ended", state: "established", influence: 1, hasBoss: false },
        ],
      },
    ]);
  });

  it("flags a change of type, which no event records", () => {
    const plan = planIncursionUpdates({
      esiIncursions: [snapshot({ type: "Incursion II" })],
      tracked: [tracked()],
      now: NOW,
    });
    expect(plan.matched[0]?.events).toEqual([]);
    expect(plan.matched[0]?.typeChanged).toBe(true);
  });
});

describe("isObservedFromStart", () => {
  const minutes = (n: number) => new Date(NOW.getTime() - n * 60_000);

  it("is true right after the previous poll", () => {
    expect(isObservedFromStart(minutes(5), NOW)).toBe(true);
    expect(isObservedFromStart(minutes(30), NOW)).toBe(true);
  });

  it("is false on the first poll ever, and after a gap", () => {
    expect(isObservedFromStart(null, NOW)).toBe(false);
    expect(isObservedFromStart(minutes(31), NOW)).toBe(false);
    expect(isObservedFromStart(minutes(24 * 60), NOW)).toBe(false);
  });
});
