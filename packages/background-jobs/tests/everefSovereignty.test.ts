import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  fetchEveRefSnapshot,
  listEveRefDay,
  listEveRefSovereigntyArchive,
  readEveRefYearArchive,
  snapshotTimeFromName,
} from "../helpers/everefSovereignty";
import { EVEREF_USER_AGENT } from "../utils/downloadFile";

// Generated with Python's bz2/tarfile. FILE is one /sovereignty/map response
// (a K-space alliance, faction and unclaimed system, and a wormhole); ERROR is
// an ESI error EVE Ref archived instead. TAR holds four entries out of order,
// one of them a proxy's HTML error page.
const FILE =
  "QlpoOTFBWSZTWYSUxXsAAChbgHAAUAR6cAAKryfcKiAAdBKU0ZBoAA9I0aEepQaGTT1AAAHCOIgpgFB6iPav4qAadixY2SwRFV6KjBfBQgc9OWLZ1oRIfBR54iTjHWBEZUe1vaSB4SBtTAloklWb8XckU4UJCElMV7A=";
const ERROR =
  "QlpoOTFBWSZTWS2lADgAABqbgFAEYBAEACqntiogAFRQaNGhpoGDVNNlH6mhBsUavD1tJLJvsvFsehdT2Q7gGHxAZCiMFvzlpYEqsLuSKcKEgW0oAcA=";
const TAR =
  "QlpoOTFBWSZTWcXS6XYAAdZfnP6SVAf/1RCIBArv99+qCAAABAgACAgwAXhtihJUm1NGmjR6gNGgA0AAABoNSbSj0mjRiAMTARpoaZGjCNARSgnqNI9TJo0wjIMho0AyGEHoFy6F/+CZI7DJMiTSEUwY4lE4fCY0rEu4sZwzpAyQSEHlrwrQGRSIlooIBwrtSwFsLDuOoJw1puSsKMxARUE6ZoUCpIVawhVv9Yd3BgCQJIO+jOFCXUKJwtTEFSEYVDwGXOAtCRJBJUIGAhxp3oVGKYBcwIIWDJGByvoYh1jHI3wY9Ah7KxCkBOg1yFj5FJK71OBhKhXaCTlcoS0QQfKRJPfypLzrZIbE9dLvtsnUWQYLxrfosoVJvQizZQ1aYi05gbiEh1hdJilraUzpkCk2gUuxDcFYYnkZ0KULzCTlAgcXsPv5zBLZCVDURIpCKIQxTmlwjQSoahx30qgLafznPA7YjOoH+LuSKcKEhi6XS7A=";

const HISTORY = "https://data.everef.net/sovereignty-map/history";
const t = (iso: string) => new Date(`${iso}Z`);

type Route = (url: string) => Response | undefined;
let route: Route;
// The code under test only ever passes a URL string.
const fetchMock = jest.fn((url: string, _init?: RequestInit) =>
  Promise.resolve(route(url) ?? new Response("not found", { status: 404 })),
);

const json = (body: unknown) => new Response(JSON.stringify(body));
const binary = (base64: string) => new Response(Buffer.from(base64, "base64"));

const realFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = realFetch;
});

describe("snapshotTimeFromName", () => {
  it("reads both archive and daily file names as UTC", () => {
    expect(
      snapshotTimeFromName(
        "sovereignty-map-2018/sovereigntymap_2018-10-29T11:20:03.json",
      ),
    ).toEqual(t("2018-10-29T11:20:03"));
    expect(
      snapshotTimeFromName("sovereignty-map-2026-10-09_00-40-05.json.bz2"),
    ).toEqual(t("2026-10-09T00:40:05"));
    expect(snapshotTimeFromName("README.md")).toBeNull();
  });
});

describe("listing EVE Ref's archive", () => {
  beforeEach(() => {
    route = (url) => {
      if (url === `${HISTORY}/index.json`) {
        return json({
          directories: [
            { name: "2026", index_url: `${HISTORY}/2026/index.json` },
            { name: "2025", index_url: `${HISTORY}/2025/index.json` },
          ],
          files: [
            {
              name: "sovereignty-map-2022.tar.bz2",
              url: `${HISTORY}/sovereignty-map-2022.tar.bz2`,
            },
            {
              name: "sovereignty-map-2017.tar.bz2",
              url: `${HISTORY}/sovereignty-map-2017.tar.bz2`,
            },
          ],
        });
      }
      if (url === `${HISTORY}/2025/index.json`) {
        return json({
          directories: [
            {
              name: "2025-12-31",
              index_url: `${HISTORY}/2025/2025-12-31/index.json`,
            },
          ],
        });
      }
      if (url === `${HISTORY}/2026/index.json`) {
        return json({
          directories: [
            {
              name: "2026-01-02",
              index_url: `${HISTORY}/2026/2026-01-02/index.json`,
            },
            {
              name: "2026-01-01",
              index_url: `${HISTORY}/2026/2026-01-01/index.json`,
            },
          ],
        });
      }
      if (url === `${HISTORY}/2026/2026-01-01/index.json`) {
        return json({
          files: [
            {
              name: "sovereignty-map-2026-01-01_01-40-05.json.bz2",
              url: "https://e.test/b",
            },
            {
              name: "sovereignty-map-2026-01-01_00-40-05.json.bz2",
              url: "https://e.test/a",
            },
            { name: "index.html", url: "https://e.test/index.html" },
          ],
        });
      }
      return undefined;
    };
  });

  it("lists every part oldest first, archives before days", async () => {
    const parts = await listEveRefSovereigntyArchive(null);

    expect(
      parts.map((p) => (p.kind === "archive" ? p.year : p.day.toISOString())),
    ).toEqual([
      2017,
      2022,
      "2025-12-31T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    ]);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      "User-Agent": EVEREF_USER_AGENT,
    });
    expect(EVEREF_USER_AGENT).toContain("JitaSpace");
  });

  it("skips the parts wholly before the history's end", async () => {
    const parts = await listEveRefSovereigntyArchive(t("2026-01-01T12:00:00"));

    expect(
      parts.map((p) => (p.kind === "day" ? p.day.toISOString() : p.year)),
    ).toEqual(["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"]);
    // Neither 2025's index nor any archive is needed.
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain(
      `${HISTORY}/2025/index.json`,
    );
  });

  it("lists a day's hourly files oldest first", async () => {
    const files = await listEveRefDay({
      kind: "day",
      day: t("2026-01-01T00:00:00"),
      indexUrl: `${HISTORY}/2026/2026-01-01/index.json`,
    });
    expect(files).toEqual([
      { observedAt: t("2026-01-01T00:40:05"), url: "https://e.test/a" },
      { observedAt: t("2026-01-01T01:40:05"), url: "https://e.test/b" },
    ]);
  });
});

describe("reading snapshots", () => {
  it("reads an hourly file as an observation of K-space only", async () => {
    route = () => binary(FILE);

    const snapshot = await fetchEveRefSnapshot({
      observedAt: t("2026-01-01T00:40:05"),
      url: "https://e.test/a",
    });

    expect(snapshot?.source).toBe("everef");
    expect([...(snapshot?.systems.keys() ?? [])]).toEqual([
      30000001, 30000002, 30000003,
    ]);
    expect(snapshot?.systems.get(30000001)).toMatchObject({
      allianceId: 99,
      corporationId: 98,
    });
    expect(snapshot?.systems.get(30000003)?.isUnclaimed).toBe(true);
  });

  it("returns null for a file holding ESI's error", async () => {
    route = () => binary(ERROR);
    await expect(
      fetchEveRefSnapshot({
        observedAt: t("2018-06-05T12:00:13"),
        url: "https://e.test/e",
      }),
    ).resolves.toBeNull();
  });

  it("waits out a 429 instead of failing", async () => {
    let calls = 0;
    route = () =>
      ++calls === 1
        ? new Response("slow down", {
            status: 429,
            headers: { "retry-after": "0.01" },
          })
        : binary(FILE);

    const snapshot = await fetchEveRefSnapshot({
      observedAt: t("2026-01-01T00:40:05"),
      url: "https://e.test/a",
    });

    expect(calls).toBe(2);
    expect(snapshot?.systems.size).toBe(3);
  });

  it("retries a file whose connection drops mid-body", async () => {
    let calls = 0;
    route = () =>
      ++calls === 1
        ? new Response(
            new ReadableStream({
              start(controller) {
                // What undici reports when EVE Ref's CDN closes the socket.
                controller.error(new TypeError("terminated"));
              },
            }),
          )
        : binary(FILE);

    const snapshot = await fetchEveRefSnapshot({
      observedAt: t("2026-01-01T00:40:05"),
      url: "https://e.test/a",
    });

    expect(calls).toBe(2);
    expect(snapshot?.systems.size).toBe(3);
  });

  it("fails on a missing file rather than reading it as a gap", async () => {
    route = () => undefined;
    await expect(
      fetchEveRefSnapshot({
        observedAt: t("2026-01-01T00:40:05"),
        url: "https://e.test/x",
      }),
    ).rejects.toThrow("404");
    // Not worth retrying.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads a yearly archive in time order, skipping errors and what is already stored", async () => {
    route = () => binary(TAR);

    const all = await readEveRefYearArchive(
      { kind: "archive", year: 2018, url: "https://e.test/2018.tar.bz2" },
      null,
    );
    const observations = [...all.observations];

    expect(all).toMatchObject({ count: 3, errors: 1 });
    expect(observations.map((o) => o.observedAt)).toEqual([
      t("2018-01-01T00:00:00"),
      t("2018-01-01T02:00:00"),
      t("2018-01-01T03:00:00"),
    ]);
    expect(
      observations.map((o) => o.systems.get(30000001)?.allianceId),
    ).toEqual([1, 2, 2]);
    // The wormhole is dropped, and a system first listed later is kept.
    expect(observations[0]?.systems.size).toBe(1);
    expect(observations[2]?.systems.get(30000002)?.factionId).toBe(500001);

    const after = await readEveRefYearArchive(
      { kind: "archive", year: 2018, url: "https://e.test/2018.tar.bz2" },
      t("2018-01-01T02:00:00"),
    );
    expect([...after.observations].map((o) => o.observedAt)).toEqual([
      t("2018-01-01T03:00:00"),
    ]);
  });
});
