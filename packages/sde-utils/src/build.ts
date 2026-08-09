import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "js-yaml";
import StreamZip from "node-stream-zip";

import {
  SDE_BUILD_NUMBER_HEADER,
  SDE_DOWNLOAD_URL,
  SDE_LATEST_BUILD_URL,
  SDE_METADATA_FILENAME,
} from "./constants";

/** Identifies one published revision of the SDE. */
export interface SdeBuild {
  /** Build number CCP stamps on each SDE publication. Increases over time. */
  buildNumber: number;
  /** ISO-8601 publication timestamp, when the source carries one. */
  releaseDate?: string;
}

/**
 * Coerce a parsed `_sde.yaml` or `latest.jsonl` payload into an `SdeBuild`.
 *
 * `_sde.yaml` nests the fields under an `sde` key while `latest.jsonl` has them
 * at the top level; both are accepted. Returns null for anything without a
 * usable build number so callers can treat "can't tell" as "not up to date"
 * rather than crashing on a corrupt or unexpected payload.
 */
function toSdeBuild(value: unknown): SdeBuild | null {
  if (typeof value !== "object" || value === null) return null;

  const nested = (value as { sde?: unknown }).sde;
  const source = (
    typeof nested === "object" && nested !== null ? nested : value
  ) as Record<string, unknown>;

  const { buildNumber, releaseDate } = source;
  if (typeof buildNumber !== "number" || !Number.isFinite(buildNumber))
    return null;

  return {
    buildNumber,
    ...(typeof releaseDate === "string" ? { releaseDate } : {}),
  };
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Read the build number straight off the archive `SDE_DOWNLOAD_URL` resolves
 * to. This describes the exact artifact we would download, so — unlike the
 * separately published index — it cannot drift from what a download produces.
 * Returns null if the header is gone or the request fails.
 */
async function latestSdeBuildFromArchive(): Promise<SdeBuild | null> {
  try {
    const response = await fetch(SDE_DOWNLOAD_URL, {
      method: "HEAD",
      redirect: "manual",
    });
    const header = response.headers.get(SDE_BUILD_NUMBER_HEADER);
    if (header === null) return null;
    const buildNumber = Number.parseInt(header, 10);
    return Number.isFinite(buildNumber) ? { buildNumber } : null;
  } catch {
    return null;
  }
}

/** Read the currently published build from CCP's static-data index. */
async function latestSdeBuildFromIndex(): Promise<SdeBuild> {
  const response = await fetch(SDE_LATEST_BUILD_URL);
  if (!response.ok) {
    throw new Error(
      `Unable to get the latest SDE build number: ${SDE_LATEST_BUILD_URL} returned ${response.status} ${response.statusText}`,
    );
  }

  // JSON Lines: today a single `sde` record, but scan every line so extra
  // records (or a trailing newline) don't break the lookup.
  for (const line of (await response.text()).split("\n")) {
    if (line.trim() === "") continue;
    const build = toSdeBuild(parseJsonOrNull(line));
    if (build) return build;
  }

  throw new Error(
    `Unable to get the latest SDE build number: no build number in ${SDE_LATEST_BUILD_URL}`,
  );
}

/**
 * The build number CCP is currently publishing, fetched without downloading the
 * ~100 MB archive. Prefers the archive's own `x-sde-build-number` header and
 * falls back to `latest.jsonl`.
 */
export async function latestSdeBuild(): Promise<SdeBuild> {
  return (
    (await latestSdeBuildFromArchive()) ?? (await latestSdeBuildFromIndex())
  );
}

/**
 * The build a downloaded `sde.zip` was cut from, read from its `_sde.yaml`
 * entry without extracting the archive. Returns null when the archive is
 * missing, unreadable, or carries no usable metadata — i.e. whenever we cannot
 * prove which build it holds.
 */
export async function sdeZipBuild(
  zipFilePath: string,
): Promise<SdeBuild | null> {
  if (!fs.existsSync(zipFilePath)) return null;

  const zip = new StreamZip.async({ file: zipFilePath });
  try {
    const contents = await zip.entryData(SDE_METADATA_FILENAME);
    return toSdeBuild(YAML.load(contents.toString("utf8")));
  } catch {
    return null;
  } finally {
    // A failed open rejects here too; the read result is what we care about.
    await zip.close().catch(() => undefined);
  }
}

/**
 * The build an already-extracted `sde/` folder was cut from. Returns null when
 * `_sde.yaml` is absent or unparseable, so a half-extracted or hand-assembled
 * folder is never mistaken for a known build.
 */
export function sdeFolderBuild(sdeRootPath: string): SdeBuild | null {
  try {
    const contents = fs.readFileSync(
      path.join(sdeRootPath, SDE_METADATA_FILENAME),
      "utf8",
    );
    return toSdeBuild(YAML.load(contents));
  } catch {
    return null;
  }
}
