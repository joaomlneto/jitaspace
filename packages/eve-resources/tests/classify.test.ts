import { describe, expect, it } from "@jest/globals";

import {
  classifyResourcePath,
  decodeResource,
  decodeText,
  getExtension,
} from "../src/index";

describe("getExtension", () => {
  it("lowercases the extension", () => {
    expect(getExtension("res:/ui/Icon.PNG")).toBe("png");
  });

  it("uses the last dot of the filename", () => {
    expect(getExtension("res:/staticdata/a.b.fsdbinary")).toBe("fsdbinary");
  });

  it("returns empty string when the filename has no extension", () => {
    expect(getExtension("res:/staticdata/code")).toBe("");
  });

  it("ignores dots in parent directory names", () => {
    expect(getExtension("res:/dir.v2/file")).toBe("");
  });

  it("treats a leading-dot filename as having no extension", () => {
    expect(getExtension("res:/.hidden")).toBe("");
  });
});

describe("classifyResourcePath", () => {
  it.each([
    ["res:/a.png", "image", "image/png", "image"],
    ["res:/a.jpg", "image", "image/jpeg", "image"],
    ["res:/a.dds", "texture", "image/vnd-ms.dds", "none"],
    ["res:/a.tga", "texture", "image/x-tga", "none"],
    ["res:/a.webm", "video", "video/webm", "video"],
    ["res:/a.ogg", "audio", "audio/ogg", "audio"],
    ["res:/a.wem", "audio", "audio/x-wwise-wem", "none"],
    ["res:/a.yaml", "text", "text/yaml", "text"],
    ["res:/a.schema", "text", "text/yaml", "text"],
    ["res:/a.json", "text", "application/json", "text"],
    ["res:/a.ttf", "font", "font/ttf", "none"],
    ["res:/a.gr2", "model", "application/octet-stream", "none"],
    ["res:/a.fsdbinary", "static-data", "application/octet-stream", "none"],
    ["res:/a.static", "static-data", "application/octet-stream", "none"],
    // EVE character/paperdoll YAML config
    ["res:/a.color", "text", "text/yaml", "text"],
    ["res:/a.type", "text", "text/yaml", "text"],
    ["res:/a.prs", "text", "text/yaml", "text"],
    ["res:/a.proj", "text", "text/yaml", "text"],
    ["res:/a.base", "text", "text/yaml", "text"],
    ["res:/a.pose", "text", "text/yaml", "text"],
    ["res:/a.info", "text", "text/yaml", "text"],
    ["res:/a.face", "text", "text/yaml", "text"],
    ["res:/a.trif", "text", "text/yaml", "text"],
  ])("classifies %s", (path, category, mimeType, preview) => {
    const type = classifyResourcePath(path);
    expect(type.category).toBe(category);
    expect(type.mimeType).toBe(mimeType);
    expect(type.preview).toBe(preview);
  });

  it("falls back to binary/octet-stream for unknown extensions", () => {
    const type = classifyResourcePath("res:/mystery.qzx");
    expect(type).toMatchObject({
      extension: "qzx",
      category: "binary",
      mimeType: "application/octet-stream",
      preview: "none",
    });
  });
});

describe("decodeText", () => {
  it("decodes UTF-8 bytes", () => {
    expect(decodeText(new TextEncoder().encode("héllo: wörld"))).toBe(
      "héllo: wörld",
    );
  });

  it("strips a leading UTF-8 byte-order mark", () => {
    const withBom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("data"),
    ]);
    expect(decodeText(withBom)).toBe("data");
  });
});

describe("decodeResource", () => {
  it("decodes text resources to a text result", () => {
    const result = decodeResource(
      "res:/a.yaml",
      new TextEncoder().encode("k: v"),
    );
    expect(result).toEqual({
      kind: "text",
      type: classifyResourcePath("res:/a.yaml"),
      text: "k: v",
    });
  });

  it("passes native media through by kind", () => {
    expect(decodeResource("res:/a.png", new Uint8Array()).kind).toBe("image");
    expect(decodeResource("res:/a.webm", new Uint8Array()).kind).toBe("video");
    expect(decodeResource("res:/a.ogg", new Uint8Array()).kind).toBe("audio");
  });

  it("returns a dds result (info null for non-DDS bytes)", () => {
    const result = decodeResource("res:/a.dds", new Uint8Array(8));
    expect(result.kind).toBe("dds");
    if (result.kind === "dds") expect(result.info).toBeNull();
  });

  it("returns raw for undecodable binary categories", () => {
    expect(decodeResource("res:/model.gr2", new Uint8Array(4)).kind).toBe(
      "raw",
    );
  });
});
