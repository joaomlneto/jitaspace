import { describe, expect, it } from "@jest/globals";

import { classifyResourcePath, getExtension } from "../src/index";

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
