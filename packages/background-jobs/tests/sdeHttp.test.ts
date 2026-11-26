import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { fetchSdeRecord, fetchSdeTable } from "../helpers/sdeHttp";

const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

afterEach(() => {
  mockFetch.mockReset();
});

const respond = (status: number, body = "") =>
  Promise.resolve(new Response(body, { status }));

describe("fetchSdeRecord", () => {
  it("returns the record from the latest release", async () => {
    mockFetch.mockReturnValueOnce(
      respond(200, '{"stationID":60003760,"typeID":52678}'),
    );

    await expect(fetchSdeRecord("npcStations", 60003760)).resolves.toEqual({
      stationID: 60003760,
      typeID: 52678,
    });
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(
      "https://sde.evetech.net/tranquility/latest/npcStations/60003760.json",
    );
    expect(new Headers(init?.headers).get("User-Agent")).toContain("JitaSpace");
  });

  it("returns null for a key the SDE does not have", async () => {
    // An Upwell structure id is not an NPC station.
    mockFetch.mockReturnValueOnce(respond(404));

    await expect(fetchSdeRecord("npcStations", 1035466617946)).resolves.toBe(
      null,
    );
  });

  it("throws on a client error rather than retrying it", async () => {
    mockFetch.mockReturnValueOnce(respond(403));

    await expect(fetchSdeRecord("npcStations", 1)).rejects.toThrow("HTTP 403");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchSdeTable", () => {
  it("keys each JSON Lines record by its first field", async () => {
    mockFetch.mockReturnValueOnce(
      respond(
        200,
        '{"raceID":1,"name":{"en":"Caldari"},"shipTypeID":601}\n' +
          '{"raceID":2,"name":{"en":"Minmatar"},"shipTypeID":588}\n',
      ),
    );

    const races = await fetchSdeTable("races");

    expect([...races.keys()]).toEqual([1, 2]);
    expect(races.get(2)).toEqual({
      raceID: 2,
      name: { en: "Minmatar" },
      shipTypeID: 588,
    });
  });
});
