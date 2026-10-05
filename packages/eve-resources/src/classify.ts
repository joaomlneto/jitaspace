/** Broad category of a resource file, derived from its extension. */
export type ResourceCategory =
  | "image" // browser-native raster/vector image
  | "texture" // GPU texture needing decoding (dds, tga, ...)
  | "video"
  | "audio"
  | "text" // utf-8 text (yaml, json, py, xml, ...)
  | "model" // 3d geometry / scene (gr2, black, red, ...)
  | "static-data" // CCP binary static data (fsdbinary, pickle, ...)
  | "font"
  | "binary"; // anything else

/** How a UI can present a file directly, without a custom decoder. */
export type ResourcePreview = "image" | "video" | "audio" | "text" | "none";

export interface ResourceFileType {
  /** Lowercased extension without the dot, or `""` if the file has none. */
  extension: string;
  category: ResourceCategory;
  /** Best-guess MIME type for serving the bytes. */
  mimeType: string;
  /** Native preview mode, or `"none"` when a custom decoder is required. */
  preview: ResourcePreview;
}

type KnownType = Omit<ResourceFileType, "extension">;

const TYPES: Record<string, KnownType> = {
  // Browser-native images
  png: { category: "image", mimeType: "image/png", preview: "image" },
  jpg: { category: "image", mimeType: "image/jpeg", preview: "image" },
  jpeg: { category: "image", mimeType: "image/jpeg", preview: "image" },
  gif: { category: "image", mimeType: "image/gif", preview: "image" },
  webp: { category: "image", mimeType: "image/webp", preview: "image" },
  bmp: { category: "image", mimeType: "image/bmp", preview: "image" },
  svg: { category: "image", mimeType: "image/svg+xml", preview: "image" },

  // GPU textures — need a decoder for preview
  dds: { category: "texture", mimeType: "image/vnd-ms.dds", preview: "none" },
  tga: { category: "texture", mimeType: "image/x-tga", preview: "none" },

  // Video
  webm: { category: "video", mimeType: "video/webm", preview: "video" },
  mp4: { category: "video", mimeType: "video/mp4", preview: "video" },
  bik: {
    category: "video",
    mimeType: "video/vnd.radgametools.bink",
    preview: "none",
  },

  // Audio
  ogg: { category: "audio", mimeType: "audio/ogg", preview: "audio" },
  wav: { category: "audio", mimeType: "audio/wav", preview: "audio" },
  mp3: { category: "audio", mimeType: "audio/mpeg", preview: "audio" },
  wem: { category: "audio", mimeType: "audio/x-wwise-wem", preview: "none" },
  bnk: { category: "audio", mimeType: "audio/x-wwise-bnk", preview: "none" },

  // Text
  txt: { category: "text", mimeType: "text/plain", preview: "text" },
  yaml: { category: "text", mimeType: "text/yaml", preview: "text" },
  yml: { category: "text", mimeType: "text/yaml", preview: "text" },
  json: { category: "text", mimeType: "application/json", preview: "text" },
  xml: { category: "text", mimeType: "application/xml", preview: "text" },
  js: { category: "text", mimeType: "text/javascript", preview: "text" },
  py: { category: "text", mimeType: "text/x-python", preview: "text" },
  fx: { category: "text", mimeType: "text/plain", preview: "text" },
  hlsl: { category: "text", mimeType: "text/plain", preview: "text" },
  h: { category: "text", mimeType: "text/plain", preview: "text" },
  csv: { category: "text", mimeType: "text/csv", preview: "text" },
  srt: { category: "text", mimeType: "text/plain", preview: "text" },
  css: { category: "text", mimeType: "text/css", preview: "text" },
  md: { category: "text", mimeType: "text/markdown", preview: "text" },
  ini: { category: "text", mimeType: "text/plain", preview: "text" },
  schema: { category: "text", mimeType: "text/yaml", preview: "text" },

  // EVE character/paperdoll config — CCP ships these as plain YAML
  color: { category: "text", mimeType: "text/yaml", preview: "text" },
  base: { category: "text", mimeType: "text/yaml", preview: "text" },
  type: { category: "text", mimeType: "text/yaml", preview: "text" },
  proj: { category: "text", mimeType: "text/yaml", preview: "text" },
  pose: { category: "text", mimeType: "text/yaml", preview: "text" },
  prs: { category: "text", mimeType: "text/yaml", preview: "text" },
  face: { category: "text", mimeType: "text/yaml", preview: "text" },
  trif: { category: "text", mimeType: "text/yaml", preview: "text" },
  info: { category: "text", mimeType: "text/yaml", preview: "text" },

  // Fonts
  ttf: { category: "font", mimeType: "font/ttf", preview: "none" },
  otf: { category: "font", mimeType: "font/otf", preview: "none" },

  // 3D models / scene graph
  gr2: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  black: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  red: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  gsf: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  vta: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  tri: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  apb: {
    category: "model",
    mimeType: "application/octet-stream",
    preview: "none",
  },

  // CCP binary static data
  fsdbinary: {
    category: "static-data",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  pickle: {
    category: "static-data",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  static: {
    category: "static-data",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  region: {
    category: "static-data",
    mimeType: "application/octet-stream",
    preview: "none",
  },
  pathdata: {
    category: "static-data",
    mimeType: "application/octet-stream",
    preview: "none",
  },
};

const FALLBACK: KnownType = {
  category: "binary",
  mimeType: "application/octet-stream",
  preview: "none",
};

/** Extract the lowercased file extension (without dot) from a path. */
export function getExtension(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Classify a resource path by its file extension. */
export function classifyResourcePath(path: string): ResourceFileType {
  const extension = getExtension(path);
  return { extension, ...(TYPES[extension] ?? FALLBACK) };
}
