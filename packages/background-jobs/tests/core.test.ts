import { describe, expect, it } from "@jest/globals";

import {
  createJobRegistry,
  NonRetriableError,
  type JobDefinition,
} from "../core";

const fakeJob = (id: string): JobDefinition => ({
  id,
  name: id,
  trigger: { type: "event" },
  handler: async () => undefined,
});

describe("core", () => {
  it("NonRetriableError carries its name and message", () => {
    const error = new NonRetriableError("nope");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("NonRetriableError");
    expect(error.message).toBe("nope");
  });

  it("createJobRegistry indexes jobs and resolves them by id", () => {
    const job = fakeJob("a");
    const registry = createJobRegistry([job]);
    expect(registry.has("a")).toBe(true);
    expect(registry.has("missing")).toBe(false);
    expect(registry.get("a")).toBe(job);
  });

  it("throws on duplicate job ids", () => {
    expect(() => createJobRegistry([fakeJob("dup"), fakeJob("dup")])).toThrow(
      "Duplicate job id",
    );
  });

  it("throws when resolving an unknown id", () => {
    const registry = createJobRegistry([fakeJob("a")]);
    expect(() => registry.get("missing")).toThrow("Unknown job id");
  });
});
