import { describe, expect, it, jest } from "@jest/globals";

// `connection()` is what turns a render request-time, so a page cached whole
// (ISR) does not store it. `next/server` needs a global `Request`, which jsdom
// lacks, so it is stubbed here as it is in the page suites.
const mockConnection = jest.fn(() => Promise.resolve());
jest.mock("next/server", () => ({ connection: () => mockConnection() }));

describe("keepOutOfCache", () => {
  it("opts the current render out of the ISR cache via connection()", async () => {
    const { keepOutOfCache } = await import("~/lib/keepOutOfCache");

    await keepOutOfCache();

    expect(mockConnection).toHaveBeenCalledTimes(1);
  });

  it("propagates what connection() throws, which is how Next postpones", async () => {
    mockConnection.mockRejectedValueOnce(new Error("postponed"));
    const { keepOutOfCache } = await import("~/lib/keepOutOfCache");

    await expect(keepOutOfCache()).rejects.toThrow("postponed");
  });
});
