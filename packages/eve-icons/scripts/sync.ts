/**
 * Refresh `assets/` and `manifest.json` from the live EVE client.
 *
 *   pnpm --filter @jitaspace/eve-icons icons:sync
 *
 * Reads Tranquility's current resource index, picks the files that
 * `scripts/sets.ts` turns into icons, downloads them from CCP's CDN (verifying
 * each against the index's MD5) and rewrites the assets folder to match. This
 * is the only step that touches the network; `generate.ts` works from what it
 * writes. Review the resulting diff like any other change: an icon CCP renamed
 * or removed is a breaking change for anyone importing it.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { EveServer, ResourceEntry } from "@jitaspace/eve-resources";
import {
  fetchResourceBytes,
  fetchResourceIndex,
} from "@jitaspace/eve-resources";

import type { Manifest, ManifestIcon } from "./manifest";
import { readPng } from "./png";
import { classify, WINDOW_NAMES } from "./sets";

const SERVER: EveServer = "tranquility";
const CONCURRENCY = 16;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "assets");
const manifestPath = join(root, "manifest.json");

interface Candidate {
  id: string;
  set: string;
  name: string;
  entry: ResourceEntry;
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const { build, entries } = await fetchResourceIndex(SERVER);
  console.log(`Tranquility build ${build}: ${entries.length} resources`);

  const candidates: Candidate[] = [];
  const unnamedWindowFiles: string[] = [];
  for (const entry of entries) {
    if (!entry.path.toLowerCase().endsWith(".png")) continue;
    const match = classify(entry.path);
    if (!match) continue;
    candidates.push({
      id: `${match.set.id}/${match.name}`,
      set: match.set.id,
      name: match.name,
      entry,
    });
    if (match.set.id === "window") {
      const stem = (entry.path.toLowerCase().split("/").pop() ?? "").slice(
        0,
        -".png".length,
      );
      if (!(stem in WINDOW_NAMES)) unnamedWindowFiles.push(entry.path);
    }
  }
  // Deterministic order: when two files collapse to the same ID and size, the
  // first path wins.
  candidates.sort((a, b) => a.entry.path.localeCompare(b.entry.path));
  console.log(`Downloading ${candidates.length} files…`);

  const downloaded = await mapConcurrent(
    candidates,
    CONCURRENCY,
    async (candidate) => {
      const bytes = await fetchResourceBytes(candidate.entry, SERVER);
      const md5 = createHash("md5").update(bytes).digest("hex");
      if (md5 !== candidate.entry.md5) {
        throw new Error(
          `${candidate.entry.path}: MD5 ${md5} does not match the index (${candidate.entry.md5})`,
        );
      }
      return { ...candidate, bytes, png: readPng(bytes) };
    },
  );

  const icons = new Map<string, ManifestIcon>();
  const outputs = new Map<string, Uint8Array>();
  const skipped: string[] = [];
  for (const file of downloaded) {
    const icon = icons.get(file.id) ?? {
      id: file.id,
      set: file.set,
      name: file.name,
      monochrome: true,
      files: [],
    };
    icons.set(file.id, icon);
    if (icon.files.some((existing) => existing.width === file.png.width)) {
      skipped.push(`${file.entry.path} (same size as another ${file.id})`);
      continue;
    }
    const asset = `${file.set}/${file.name}.${file.png.width}.png`;
    icon.files.push({
      file: asset,
      width: file.png.width,
      height: file.png.height,
      source: file.entry.path,
      md5: file.entry.md5,
    });
    icon.monochrome &&= file.png.monochrome;
    outputs.set(asset, file.bytes);
  }

  const manifest: Manifest = {
    server: SERVER,
    build,
    icons: [...icons.values()]
      .map((icon) => ({
        ...icon,
        files: icon.files.sort((a, b) => a.width - b.width),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };

  const previous: Manifest | null = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest)
    : null;

  rmSync(assetsDir, { recursive: true, force: true });
  for (const [asset, bytes] of outputs) {
    const path = join(assetsDir, asset);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const bySet = new Map<string, number>();
  for (const icon of manifest.icons) {
    bySet.set(icon.set, (bySet.get(icon.set) ?? 0) + 1);
  }
  console.log(
    `Wrote ${manifest.icons.length} icons (${outputs.size} files): ${[...bySet]
      .map(([set, count]) => `${set} ${count}`)
      .join(", ")}`,
  );
  if (previous) {
    const before = new Set(previous.icons.map((icon) => icon.id));
    const after = new Set(manifest.icons.map((icon) => icon.id));
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));
    if (added.length) console.log(`Added: ${added.join(", ")}`);
    if (removed.length) {
      console.warn(`REMOVED (breaking for importers): ${removed.join(", ")}`);
    }
  }
  if (skipped.length) {
    console.log(`Skipped duplicate sizes:\n  ${skipped.join("\n  ")}`);
  }
  if (unnamedWindowFiles.length) {
    console.warn(
      `Window icons with no entry in WINDOW_NAMES (named from their file):\n  ${unnamedWindowFiles.join("\n  ")}`,
    );
  }
}

await main();
