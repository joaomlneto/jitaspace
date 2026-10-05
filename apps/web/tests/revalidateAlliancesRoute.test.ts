/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockRevalidatePath = jest.fn();
const mockRevalidateTag = jest.fn();

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

// Mutable so each test can pick the secret the deployment runs with.
const mockEnv: { CRON_SECRET?: string } = {};
jest.mock("~/env", () => ({ env: mockEnv }));

const SECRET = "0123456789abcdef-test-secret";

// Loaded lazily, after the mocks above are registered: @swc/jest does not hoist
// jest.mock above a top-level import.
const loadPOST = () =>
  (
    require("../app/api/revalidate/alliances/route") as {
      POST: (request: Request) => Promise<Response>;
    }
  ).POST;

const post = (body: string | undefined, authorization = `Bearer ${SECRET}`) =>
  loadPOST()(
    new Request("https://www.jita.space/api/revalidate/alliances", {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body,
    }),
  );

beforeEach(() => {
  mockRevalidatePath.mockReset();
  mockRevalidateTag.mockReset();
  mockEnv.CRON_SECRET = SECRET;
});

describe("POST /api/revalidate/alliances", () => {
  it("expires each alliance page and its data, and marks the list stale", async () => {
    const res = await post(JSON.stringify({ allianceIds: [1, 2, 2] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: 2 });
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/alliance/1"],
      ["/alliance/2"],
    ]);
    // Each page's database read is expired with it, so the fresh render does
    // not reuse the stale rows; "max": the list reads the database, so its
    // next visitor keeps the old copy while a fresh one renders.
    expect(mockRevalidateTag.mock.calls).toEqual([
      ["alliance:1", { expire: 0 }],
      ["alliance:2", { expire: 0 }],
      ["alliances", "max"],
    ]);
  });

  it("refuses a wrong secret and evicts nothing", async () => {
    const res = await post(
      JSON.stringify({ allianceIds: [1] }),
      "Bearer wrong-secret-of-some-length",
    );

    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    mockEnv.CRON_SECRET = undefined;

    const res = await post(
      JSON.stringify({ allianceIds: [1] }),
      "Bearer undefined",
    );

    expect(res.status).toBe(401);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("not json");

    expect(res.status).toBe(400);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects IDs that are not positive integers", async () => {
    const res = await post(JSON.stringify({ allianceIds: ["../admin"] }));

    expect(res.status).toBe(400);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
