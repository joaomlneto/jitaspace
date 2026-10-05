import { describe, expect, it } from "@jest/globals";

import type { ResourceEntry } from "../src/index";
import {
  BINARIES_BASE_URL,
  binariesUrl,
  buildTreeIndex,
  CCP_SERVERS,
  EVE_CLIENT_POINTER,
  isCcpServer,
  listChildren,
  normalizeDirPath,
  parseResourceIndex,
  PLATFORM_LAYOUT,
  pointerFilename,
  PROVIDER_ENDPOINTS,
  providerOf,
  RESFILE_INDEX_PATH,
  RESFILE_INDEX_WINDOWS_PATH,
  RESOURCES_BASE_URL,
  resourceUrl,
  SERVER_CONFIG,
  serverEndpoints,
} from "../src/index";

describe("constants", () => {
  it("exposes the two CDN hosts and the resfile-index pointer", () => {
    expect(BINARIES_BASE_URL).toBe("https://binaries.eveonline.com/");
    expect(RESOURCES_BASE_URL).toBe("https://resources.eveonline.com/");
    expect(RESFILE_INDEX_PATH).toBe("app:/resfileindex.txt");
  });

  it("lays out each platform's app index and resfile indexes", () => {
    expect(PLATFORM_LAYOUT.windows).toEqual({
      appIndexPrefix: "eveonline_",
      resfileIndexPath: RESFILE_INDEX_PATH,
      resfileOverlayPath: RESFILE_INDEX_WINDOWS_PATH,
    });
    expect(RESFILE_INDEX_WINDOWS_PATH).toBe("app:/resfileindex_Windows.txt");
    expect(PLATFORM_LAYOUT.macos.appIndexPrefix).toBe("eveonlinemacOS_");
    expect(PLATFORM_LAYOUT.macos.resfileOverlayPath).toMatch(
      /resfileindex_macOS\.txt$/,
    );
  });

  it("maps each server to its build pointer", () => {
    expect(EVE_CLIENT_POINTER.tranquility).toBe("eveclient_TQ.json");
    expect(EVE_CLIENT_POINTER.singularity).toBe("eveclient_SISI.json");
    expect(EVE_CLIENT_POINTER.serenity).toBe("eveclient_SERENITY.json");
    expect(EVE_CLIENT_POINTER.infinity).toBe("eveclient_INFINITY.json");
  });
});

describe("providers and servers", () => {
  it("routes CCP servers to the eveonline.com hosts", () => {
    expect(providerOf("tranquility")).toBe("ccp");
    expect(providerOf("singularity")).toBe("ccp");
    expect(serverEndpoints("tranquility")).toEqual(PROVIDER_ENDPOINTS.ccp);
    expect(PROVIDER_ENDPOINTS.ccp).toEqual({
      metadataBaseUrl: "https://binaries.eveonline.com/",
      indexBaseUrl: "https://binaries.eveonline.com/",
      appBaseUrl: "https://binaries.eveonline.com/",
      resBaseUrl: "https://resources.eveonline.com/",
    });
  });

  it("routes NetEase (EVE China) servers to the aliyuncs / ma79 hosts", () => {
    expect(providerOf("serenity")).toBe("netease");
    expect(providerOf("infinity")).toBe("netease");
    expect(serverEndpoints("serenity")).toEqual(PROVIDER_ENDPOINTS.netease);
    expect(serverEndpoints("infinity")).toEqual(PROVIDER_ENDPOINTS.netease);
    expect(PROVIDER_ENDPOINTS.netease).toEqual({
      metadataBaseUrl:
        "https://eve-china-version-files.oss-cn-hangzhou.aliyuncs.com/",
      indexBaseUrl:
        "https://eve-china-version-files.oss-cn-hangzhou.aliyuncs.com/",
      appBaseUrl: "https://ma79.gdl.netease.com/eve/binaries/",
      resBaseUrl: "https://ma79.gdl.netease.com/eve/resources/",
    });
  });

  it("every base URL ends in a slash so it concatenates with a relative path", () => {
    for (const endpoints of Object.values(PROVIDER_ENDPOINTS)) {
      for (const url of Object.values(endpoints) as string[]) {
        expect(url.endsWith("/")).toBe(true);
      }
    }
  });

  it("derives each pointer filename from the server's metadata token", () => {
    for (const server of Object.keys(
      SERVER_CONFIG,
    ) as (keyof typeof SERVER_CONFIG)[]) {
      expect(pointerFilename(server)).toBe(
        `eveclient_${SERVER_CONFIG[server].metadataToken}.json`,
      );
    }
  });

  it("isCcpServer marks only the CCP-operated clusters", () => {
    expect(CCP_SERVERS).toEqual(["tranquility", "singularity"]);
    expect(isCcpServer("tranquility")).toBe(true);
    expect(isCcpServer("singularity")).toBe(true);
    expect(isCcpServer("serenity")).toBe(false);
    expect(isCcpServer("infinity")).toBe(false);
  });
});

describe("url helpers", () => {
  it("builds resource and binaries URLs from a hashed relative path", () => {
    expect(resourceUrl("ab/abcd_ef")).toBe(
      "https://resources.eveonline.com/ab/abcd_ef",
    );
    expect(binariesUrl("ab/abcd_ef")).toBe(
      "https://binaries.eveonline.com/ab/abcd_ef",
    );
  });

  it("defaults to Tranquility (CCP) when no server is given", () => {
    expect(resourceUrl("ab/abcd_ef")).toBe(
      resourceUrl("ab/abcd_ef", "tranquility"),
    );
    expect(binariesUrl("ab/abcd_ef")).toBe(
      binariesUrl("ab/abcd_ef", "tranquility"),
    );
  });

  it("resolves NetEase (EVE China) URLs against the ma79 hosts", () => {
    expect(resourceUrl("ab/abcd_ef", "serenity")).toBe(
      "https://ma79.gdl.netease.com/eve/resources/ab/abcd_ef",
    );
    expect(binariesUrl("ab/abcd_ef", "serenity")).toBe(
      "https://ma79.gdl.netease.com/eve/binaries/ab/abcd_ef",
    );
    // Infinity shares the NetEase provider, so it resolves to the same hosts.
    expect(resourceUrl("ab/abcd_ef", "infinity")).toBe(
      "https://ma79.gdl.netease.com/eve/resources/ab/abcd_ef",
    );
  });
});

describe("parseResourceIndex", () => {
  it("parses a 5-column res line", () => {
    const [entry] = parseResourceIndex(
      "res:/ui/foo.png,72/7262_fab2,fab2,26444,8827",
    );
    expect(entry).toEqual({
      path: "res:/ui/foo.png",
      relPath: "72/7262_fab2",
      md5: "fab2",
      size: 26444,
      compressedSize: 8827,
    } satisfies ResourceEntry);
  });

  it("parses a 6-column app line, capturing the file mode", () => {
    const [entry] = parseResourceIndex(
      "app:/sub/foo.txt,d5/d5f9_0b7b,0b7b,1535120,544073,33188",
    );
    expect(entry?.mode).toBe(33188);
    expect(entry?.path).toBe("app:/sub/foo.txt");
    expect(entry?.size).toBe(1535120);
  });

  it("skips blank lines and lines without a path or relPath", () => {
    const entries = parseResourceIndex(
      ["", "   ", "res:/a.txt,ab/cd,md5,1,1", ",no/path", "res:/b.txt"].join(
        "\n",
      ),
    );
    // Only the well-formed line and `res:/b.txt` (path present, relPath empty → skipped).
    expect(entries.map((e) => e.path)).toEqual(["res:/a.txt"]);
  });

  it("defaults an unparseable file mode to 0 and omits an empty one", () => {
    const [bad, empty] = parseResourceIndex(
      ["app:/a,ab/cd,md5,1,1,rw-r--r--", "app:/b,ab/cd,md5,1,1,"].join("\n"),
    );
    expect(bad?.mode).toBe(0);
    expect(empty).not.toHaveProperty("mode");
  });

  it("defaults the missing trailing columns of a short line", () => {
    expect(parseResourceIndex("res:/a.txt,ab/cd")).toEqual([
      {
        path: "res:/a.txt",
        relPath: "ab/cd",
        md5: "",
        size: 0,
        compressedSize: 0,
      },
    ]);
  });

  it("defaults unparseable sizes to 0 and trims trailing whitespace", () => {
    const [entry] = parseResourceIndex("res:/a.txt,ab/cd,md5,notanumber,  \r");
    expect(entry?.size).toBe(0);
    expect(entry?.compressedSize).toBe(0);
  });
});

describe("tree", () => {
  const entries = parseResourceIndex(
    [
      "res:/staticdata/regions.static,a/1,m,10,5",
      "res:/staticdata/map/jumps.static,a/2,m,10,5",
      "res:/audio/login.wem,a/3,m,10,5",
      "res:/top.txt,a/4,m,10,5",
      "app:/start.ini,b/1,m,10,5",
      "app:/sub/bar.txt,b/2,m,10,5",
    ].join("\n"),
  );
  const tree = buildTreeIndex(entries);

  it("normalizeDirPath ensures a single trailing slash", () => {
    expect(normalizeDirPath("res:/staticdata")).toBe("res:/staticdata/");
    expect(normalizeDirPath("res:/staticdata/")).toBe("res:/staticdata/");
    expect(normalizeDirPath("")).toBe("res:/");
  });

  it("indexes every entry by its exact path", () => {
    expect(tree.byPath.get("res:/staticdata/regions.static")?.relPath).toBe(
      "a/1",
    );
    expect(tree.byPath.get("app:/start.ini")?.relPath).toBe("b/1");
    expect(tree.byPath.size).toBe(6);
  });

  it("lists immediate children of a res directory, dirs and files sorted", () => {
    const listing = listChildren(tree, "res:/staticdata/");
    expect(listing.directories.map((d) => d.name)).toEqual(["map"]);
    expect(listing.directories[0]?.path).toBe("res:/staticdata/map/");
    expect(listing.files.map((f) => f.path)).toEqual([
      "res:/staticdata/regions.static",
    ]);
  });

  it("lists the res root, mixing top-level files and subdirectories", () => {
    const listing = listChildren(tree, "res:/");
    expect(listing.directories.map((d) => d.name).sort()).toEqual([
      "audio",
      "staticdata",
    ]);
    expect(listing.files.map((f) => f.path)).toEqual(["res:/top.txt"]);
  });

  it("builds a separate tree branch for the app scheme", () => {
    const root = listChildren(tree, "app:/");
    expect(root.directories.map((d) => d.name)).toEqual(["sub"]);
    expect(root.files.map((f) => f.path)).toEqual(["app:/start.ini"]);
    expect(listChildren(tree, "app:/sub/").files.map((f) => f.path)).toEqual([
      "app:/sub/bar.txt",
    ]);
  });

  it("returns empty listings for an unknown directory", () => {
    const listing = listChildren(tree, "res:/does/not/exist/");
    expect(listing.directories).toEqual([]);
    expect(listing.files).toEqual([]);
    expect(listing.path).toBe("res:/does/not/exist/");
  });

  it("accepts a path without a trailing slash", () => {
    expect(listChildren(tree, "res:/staticdata").files).toHaveLength(1);
  });

  it("sorts a directory's files by path", () => {
    const sorted = buildTreeIndex(
      parseResourceIndex(
        ["res:/d/c.txt,a/1", "res:/d/a.txt,a/2", "res:/d/b.txt,a/3"].join("\n"),
      ),
    );
    expect(listChildren(sorted, "res:/d/").files.map((f) => f.path)).toEqual([
      "res:/d/a.txt",
      "res:/d/b.txt",
      "res:/d/c.txt",
    ]);
  });

  it("keeps only the last entry for a duplicated path", () => {
    const dup = buildTreeIndex(
      parseResourceIndex(
        [
          "res:/d/a.txt,base/1",
          "res:/d/b.txt,base/2",
          "res:/d/a.txt,overlay/1",
        ].join("\n"),
      ),
    );
    expect(dup.byPath.get("res:/d/a.txt")?.relPath).toBe("overlay/1");
    expect(
      listChildren(dup, "res:/d/").files.map((f) => `${f.path}=${f.relPath}`),
    ).toEqual(["res:/d/a.txt=overlay/1", "res:/d/b.txt=base/2"]);
  });

  it("collapses empty path segments", () => {
    const tree2 = buildTreeIndex(parseResourceIndex("res:/a//b.txt,a/1"));
    expect(listChildren(tree2, "res:/").directories.map((d) => d.name)).toEqual(
      ["a"],
    );
    expect(listChildren(tree2, "res:/a/").files.map((f) => f.path)).toEqual([
      "res:/a//b.txt",
    ]);
  });

  it("indexes a scheme-less path for lookup but leaves it out of the tree", () => {
    const tree2 = buildTreeIndex(parseResourceIndex("loose.txt,a/1"));
    expect(tree2.byPath.get("loose.txt")?.relPath).toBe("a/1");
    expect(tree2.directories.size).toBe(0);
  });
});
