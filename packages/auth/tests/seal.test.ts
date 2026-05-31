import { sealDataWithAuthSecret } from "../utils/sealDataWithAuthSecret";
import { unsealDataWithAuthSecret } from "../utils/unsealDataWithAuthSecret";

const secret = "0123456789abcdef0123456789abcdef"; // >= 32 chars for @hapi/iron

describe("sealDataWithAuthSecret / unsealDataWithAuthSecret", () => {
  it("round-trips data without a ttl", async () => {
    const sealed = await sealDataWithAuthSecret({ data: { a: 1 }, secret });
    expect(typeof sealed).toBe("string");
    expect(await unsealDataWithAuthSecret({ data: sealed, secret })).toEqual({
      a: 1,
    });
  });

  it("round-trips data with a ttl", async () => {
    const sealed = await sealDataWithAuthSecret({
      data: { b: 2 },
      secret,
      ttlMs: 60_000,
    });
    expect(
      await unsealDataWithAuthSecret({ data: sealed, secret, ttlMs: 60_000 }),
    ).toEqual({ b: 2 });
  });

  it("honours the provided secret (different secret fails to unseal)", async () => {
    const sealed = await sealDataWithAuthSecret({ data: { c: 3 }, secret });
    await expect(
      unsealDataWithAuthSecret({
        data: sealed,
        secret: "ffffffffffffffffffffffffffffffff",
      }),
    ).rejects.toBeDefined();
  });

  it("throws when no secret is provided", async () => {
    await expect(
      sealDataWithAuthSecret({ data: {}, secret: "" }),
    ).rejects.toThrow("Secret not set!");
    await expect(
      unsealDataWithAuthSecret({ data: "x", secret: "" }),
    ).rejects.toThrow("Secret not set!");
  });
});
