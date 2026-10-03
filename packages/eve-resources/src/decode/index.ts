import type { ResourceFileType } from "../classify";
import type { DdsInfo } from "./dds";
import { classifyResourcePath } from "../classify";
import { parseDdsHeader } from "./dds";
import { decodeText } from "./text";

export * from "./text";
export * from "./gzip";
export * from "./dds";
export * from "./bc";
export * from "./bptc";
export * from "./inspect";
export * from "./tga";
export * from "./png";
export * from "./pickle";

/**
 * The result of decoding a resource file. A discriminated union so callers
 * (web preview pane, CLI) can branch on `kind`.
 *
 * Covers text decoding, native-media passthrough, and DDS *header* parsing;
 * everything else falls through to `kind: "raw"` (decode DDS pixels with
 * {@link decodeDds}).
 */
export type DecodedResource =
  | { kind: "text"; type: ResourceFileType; text: string }
  | { kind: "image"; type: ResourceFileType; mimeType: string }
  | { kind: "video"; type: ResourceFileType; mimeType: string }
  | { kind: "audio"; type: ResourceFileType; mimeType: string }
  | { kind: "dds"; type: ResourceFileType; info: DdsInfo | null }
  | { kind: "raw"; type: ResourceFileType };

/**
 * Decode a resource file from its path (for classification) and raw bytes.
 */
export function decodeResource(
  path: string,
  bytes: Uint8Array,
): DecodedResource {
  const type = classifyResourcePath(path);

  switch (type.preview) {
    case "text":
      return { kind: "text", type, text: decodeText(bytes) };
    case "image":
      return { kind: "image", type, mimeType: type.mimeType };
    case "video":
      return { kind: "video", type, mimeType: type.mimeType };
    case "audio":
      return { kind: "audio", type, mimeType: type.mimeType };
    case "none":
      break;
  }

  if (type.extension === "dds") {
    return { kind: "dds", type, info: parseDdsHeader(bytes) };
  }

  return { kind: "raw", type };
}
