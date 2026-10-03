import { gzipSync } from "node:zlib";
import { describe, expect, it } from "@jest/globals";

import type { ResourceEntry } from "../src/index";
import {
  entryUrl,
  fetchAppIndex,
  fetchResfileIndex,
  fetchResourceBytes,
  fetchResourceIndex,
  getCurrentBuild,
} from "../src/index";

/** A `fetch` stand-in that serves canned responses keyed by URL. */
function mockFetch(
  routes: Record<string, { body?: BodyInit; status?: number }>,
): typeof fetch {
  return (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const route = routes[url];
    if (!route) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }
    return Promise.resolve(
      new Response(route.body ?? "", { status: route.status ?? 200 }),
    );
  };
}

const POINTER = "https://binaries.eveonline.com/eveclient_TQ.json";
const APP_INDEX = "https://binaries.eveonline.com/eveonline_100.txt";

describe("getCurrentBuild", () => {
  it("returns the parsed build pointer document", async () => {
    const fetchImpl = mockFetch({
      [POINTER]: { body: JSON.stringify({ build: "100", protected: false }) },
    });
    await expect(
      getCurrentBuild("tranquility", fetchImpl),
    ).resolves.toMatchObject({ build: "100" });
  });

  it("throws on a non-OK response", async () => {
    const fetchImpl = mockFetch({ [POINTER]: { status: 503 } });
    await expect(getCurrentBuild("tranquility", fetchImpl)).rejects.toThrow(
      /HTTP 503/,
    );
  });
});

describe("app + resfile index resolution", () => {
  const appIndexBody = [
    "app:/resfileindex.txt,rf/hash_a,md5,20,5,33188",
    "app:/start.ini,cc/hash_b,md5,30,9,33188",
  ].join("\n");
  const resfileBody = [
    "res:/a.txt,a/1,m,10,5",
    "res:/staticdata/b.static,a/2,m,10,5",
  ].join("\n");

  it("fetchAppIndex parses the app index for a build", async () => {
    const fetchImpl = mockFetch({ [APP_INDEX]: { body: appIndexBody } });
    const entries = await fetchAppIndex("100", fetchImpl);
    expect(entries.map((e) => e.path)).toEqual([
      "app:/resfileindex.txt",
      "app:/start.ini",
    ]);
  });

  it("fetchResfileIndex follows the app index pointer to the resfile index", async () => {
    const fetchImpl = mockFetch({
      [APP_INDEX]: { body: appIndexBody },
      "https://binaries.eveonline.com/rf/hash_a": { body: resfileBody },
    });
    const entries = await fetchResfileIndex("100", fetchImpl);
    expect(entries.map((e) => e.path)).toEqual([
      "res:/a.txt",
      "res:/staticdata/b.static",
    ]);
  });

  it("fetchResfileIndex throws when the app index lacks a resfile pointer", async () => {
    const fetchImpl = mockFetch({
      [APP_INDEX]: { body: "app:/start.ini,cc/hash_b,md5,30,9,33188" },
    });
    await expect(fetchResfileIndex("100", fetchImpl)).rejects.toThrow(
      /does not contain app:\/resfileindex\.txt/,
    );
  });

  it("fetchResourceIndex chains build → app index → resfile index", async () => {
    const fetchImpl = mockFetch({
      [POINTER]: { body: JSON.stringify({ build: "100" }) },
      [APP_INDEX]: { body: appIndexBody },
      "https://binaries.eveonline.com/rf/hash_a": { body: resfileBody },
    });
    const index = await fetchResourceIndex("tranquility", fetchImpl);
    expect(index.build).toBe("100");
    expect(index.server).toBe("tranquility");
    expect(index.entries).toHaveLength(2);
  });
});

describe("platform-aware index resolution", () => {
  const MACOS_APP_INDEX =
    "https://binaries.eveonline.com/eveonlinemacOS_100.txt";
  const MACOS_BASE = "app:/EVE.app/Contents/Resources/build/resfileindex.txt";
  const MACOS_OVERLAY =
    "app:/EVE.app/Contents/Resources/build/resfileindex_macOS.txt";

  const winAppIndex = [
    "app:/resfileindex.txt,rf/base,md5,20,5,33188",
    "app:/resfileindex_Windows.txt,rf/win,md5,20,5,33188",
  ].join("\n");
  const macAppIndex = [
    `${MACOS_BASE},mac/base,md5,20,5,33188`,
    `${MACOS_OVERLAY},mac/overlay,md5,20,5,33188`,
  ].join("\n");
  const baseBody = "res:/shared.txt,a/1,m,10,5";
  const winOverlayBody = "res:/graphics/effect.dx11/x.sm_hi,a/2,m,10,5";
  const macOverlayBody = "res:/graphics/effect.metal/x.sm_hi,a/3,m,10,5";

  it("fetchAppIndex fetches the macOS app index for the macos platform", async () => {
    const fetchImpl = mockFetch({ [MACOS_APP_INDEX]: { body: macAppIndex } });
    const entries = await fetchAppIndex("100", fetchImpl, "macos");
    expect(entries.map((e) => e.path)).toEqual([MACOS_BASE, MACOS_OVERLAY]);
  });

  it("fetchResfileIndex merges the Windows shader overlay for the windows platform", async () => {
    const fetchImpl = mockFetch({
      [APP_INDEX]: { body: winAppIndex },
      "https://binaries.eveonline.com/rf/base": { body: baseBody },
      "https://binaries.eveonline.com/rf/win": { body: winOverlayBody },
    });
    const entries = await fetchResfileIndex("100", fetchImpl, "windows");
    expect(entries.map((e) => e.path)).toEqual([
      "res:/shared.txt",
      "res:/graphics/effect.dx11/x.sm_hi",
    ]);
  });

  it("fetchResfileIndex uses the macOS base path and merges the Metal overlay", async () => {
    const fetchImpl = mockFetch({
      [MACOS_APP_INDEX]: { body: macAppIndex },
      "https://binaries.eveonline.com/mac/base": { body: baseBody },
      "https://binaries.eveonline.com/mac/overlay": { body: macOverlayBody },
    });
    const entries = await fetchResfileIndex("100", fetchImpl, "macos");
    expect(entries.map((e) => e.path)).toEqual([
      "res:/shared.txt",
      "res:/graphics/effect.metal/x.sm_hi",
    ]);
  });

  it("fetchResfileIndex without a platform returns the base set only", async () => {
    const fetchImpl = mockFetch({
      [APP_INDEX]: { body: winAppIndex },
      "https://binaries.eveonline.com/rf/base": { body: baseBody },
      "https://binaries.eveonline.com/rf/win": { body: winOverlayBody },
    });
    const entries = await fetchResfileIndex("100", fetchImpl);
    expect(entries.map((e) => e.path)).toEqual(["res:/shared.txt"]);
  });
});

describe("entryUrl", () => {
  it("routes res:/ entries to the resources host", () => {
    const entry: ResourceEntry = {
      path: "res:/x.png",
      relPath: "a/1",
      md5: "m",
      size: 1,
      compressedSize: 1,
    };
    expect(entryUrl(entry)).toBe("https://resources.eveonline.com/a/1");
  });

  it("routes app:/ entries to the binaries host", () => {
    const entry: ResourceEntry = {
      path: "app:/start.ini",
      relPath: "b/2",
      md5: "m",
      size: 1,
      compressedSize: 1,
    };
    expect(entryUrl(entry)).toBe("https://binaries.eveonline.com/b/2");
  });
});

describe("fetchResourceBytes", () => {
  const entry: ResourceEntry = {
    path: "res:/x.bin",
    relPath: "a/1",
    md5: "m",
    size: 1,
    compressedSize: 1,
  };
  const url = "https://resources.eveonline.com/a/1";

  it("returns raw bytes when the response is not gzipped", async () => {
    const payload = new TextEncoder().encode("plain bytes");
    const bytes = await fetchResourceBytes(
      entry,
      mockFetch({ [url]: { body: payload } }),
    );
    expect(new TextDecoder().decode(bytes)).toBe("plain bytes");
  });

  it("transparently gunzips a gzip-magic response", async () => {
    const original = new TextEncoder().encode("compressed payload");
    const gz = gzipSync(original);
    expect(gz[0]).toBe(0x1f); // sanity: real gzip magic
    const bytes = await fetchResourceBytes(
      entry,
      mockFetch({ [url]: { body: gz } }),
    );
    expect(new TextDecoder().decode(bytes)).toBe("compressed payload");
  });

  it("throws on a non-OK upstream response", async () => {
    await expect(
      fetchResourceBytes(entry, mockFetch({ [url]: { status: 500 } })),
    ).rejects.toThrow(/HTTP 500/);
  });
});

describe("NetEase (EVE China) server resolution", () => {
  // metadata + app index live on the aliyuncs OSS bucket; the content-addressed
  // app/res files on the ma79 netease CDN. This split is the whole point of the
  // per-server endpoint plumbing, so exercise the full chain across both hosts.
  const ALIYUNCS =
    "https://eve-china-version-files.oss-cn-hangzhou.aliyuncs.com/";
  const MA79_BIN = "https://ma79.gdl.netease.com/eve/binaries/";
  const MA79_RES = "https://ma79.gdl.netease.com/eve/resources/";
  const SER_POINTER = `${ALIYUNCS}eveclient_SERENITY.json`;
  const SER_APP_INDEX = `${ALIYUNCS}eveonline_100.txt`;
  const appIndexBody = [
    "app:/resfileindex.txt,rf/hash_a,md5,20,5,33188",
    "app:/start.ini,cc/hash_b,md5,30,9,33188",
  ].join("\n");
  const resfileBody = "res:/a.txt,a/1,m,10,5";

  it("getCurrentBuild reads the Serenity pointer from the aliyuncs host", async () => {
    const fetchImpl = mockFetch({
      [SER_POINTER]: { body: JSON.stringify({ build: "100" }) },
    });
    await expect(getCurrentBuild("serenity", fetchImpl)).resolves.toMatchObject(
      {
        build: "100",
      },
    );
  });

  it("fetchAppIndex reads the app index from the aliyuncs host", async () => {
    const fetchImpl = mockFetch({ [SER_APP_INDEX]: { body: appIndexBody } });
    const entries = await fetchAppIndex(
      "100",
      fetchImpl,
      "windows",
      "serenity",
    );
    expect(entries.map((e) => e.path)).toEqual([
      "app:/resfileindex.txt",
      "app:/start.ini",
    ]);
  });

  it("fetchResfileIndex pulls the index file from the ma79 binaries host", async () => {
    const fetchImpl = mockFetch({
      [SER_APP_INDEX]: { body: appIndexBody },
      // The resfile index *file* is content-addressed on the app host (ma79),
      // NOT the aliyuncs index host — the split this asserts.
      [`${MA79_BIN}rf/hash_a`]: { body: resfileBody },
    });
    const entries = await fetchResfileIndex(
      "100",
      fetchImpl,
      undefined,
      "serenity",
    );
    expect(entries.map((e) => e.path)).toEqual(["res:/a.txt"]);
  });

  it("fetchResourceIndex chains pointer → app index → resfile across both hosts", async () => {
    const fetchImpl = mockFetch({
      [SER_POINTER]: { body: JSON.stringify({ build: "100" }) },
      [SER_APP_INDEX]: { body: appIndexBody },
      [`${MA79_BIN}rf/hash_a`]: { body: resfileBody },
    });
    const index = await fetchResourceIndex("serenity", fetchImpl);
    expect(index).toMatchObject({ server: "serenity", build: "100" });
    expect(index.entries.map((e) => e.path)).toEqual(["res:/a.txt"]);
  });

  it("entryUrl routes res:/ to ma79 resources and app:/ to ma79 binaries", () => {
    const res: ResourceEntry = {
      path: "res:/x.png",
      relPath: "a/1",
      md5: "m",
      size: 1,
      compressedSize: 1,
    };
    const app: ResourceEntry = {
      ...res,
      path: "app:/start.ini",
      relPath: "b/2",
    };
    expect(entryUrl(res, "serenity")).toBe(`${MA79_RES}a/1`);
    expect(entryUrl(app, "serenity")).toBe(`${MA79_BIN}b/2`);
  });

  it("fetchResourceBytes fetches from the ma79 resources host", async () => {
    const res: ResourceEntry = {
      path: "res:/x.bin",
      relPath: "a/1",
      md5: "m",
      size: 1,
      compressedSize: 1,
    };
    const payload = new TextEncoder().encode("china bytes");
    const bytes = await fetchResourceBytes(
      res,
      mockFetch({ [`${MA79_RES}a/1`]: { body: payload } }),
      "serenity",
    );
    expect(new TextDecoder().decode(bytes)).toBe("china bytes");
  });
});
