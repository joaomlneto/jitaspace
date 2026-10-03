import { describe, expect, it, jest } from "@jest/globals";

import type * as HistorySql from "~/lib/history-sql";

// `@jitaspace/db-builds` builds a real Prisma client on import, so stub the two
// exports the helper reads. `schema` is switched per test through `doMock`.
const load = (schema: string) => {
  jest.resetModules();
  jest.doMock("@jitaspace/db-builds", () => ({
    buildsSchema: schema,
    Prisma: { raw: (sql: string) => ({ raw: sql }) },
  }));
  return (require("~/lib/history-sql") as typeof HistorySql).historyTable;
};

describe("historyTable", () => {
  it("qualifies a table with the history schema, quoting both parts", () => {
    expect(load("history")("Change")).toEqual({ raw: '"history"."Change"' });
  });

  it("qualifies with `public` like any other schema", () => {
    expect(load("public")("BuildDiff")).toEqual({
      raw: '"public"."BuildDiff"',
    });
  });

  it("escapes a quote in the schema name instead of ending the identifier", () => {
    // The schema comes from an env var; it must still never break out of its
    // quotes into the surrounding statement.
    expect(load('x"; DROP TABLE "Build; --')("Build")).toEqual({
      raw: '"x""; DROP TABLE ""Build; --"."Build"',
    });
  });
});
