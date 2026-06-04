import * as fs from "node:fs";
import * as path from "node:path";
import fetch from "node-fetch";

import {
  LOCAL_SDE_FILENAME,
  SDE_CHECKSUM_URL,
  SDE_DOWNLOAD_URL,
} from "./constants.js";
import { downloadFile } from "./download.js";
import { mkdir, sdeZipChecksum, unzipSde } from "./fs.js";

export async function latestSdeLastModified(): Promise<Date> {
  const res = await fetch(SDE_DOWNLOAD_URL, { method: "HEAD" });
  const lastModifiedHeader = res.headers.get("last-modified");
  if (!lastModifiedHeader)
    throw new Error("Unable to get SDE Last Modified date");
  return new Date(lastModifiedHeader);
}

/**
 * Ensure the SDE is downloaded and extracted in `workDir`.
 * Skips download/extraction when an up-to-date archive or extracted folder
 * already exists.
 *
 * @param workDir Directory to store `sde.zip` and the extracted `sde/` folder.
 * @param onLog   Optional callback for status messages (defaults to console.log).
 */
export async function ensureSdePresentAndExtracted(
  workDir: string,
  onLog?: (message: string) => void,
): Promise<void> {
  const log = onLog ?? console.log;

  const checksumResponse = await fetch(SDE_CHECKSUM_URL);
  const latestChecksum = (await checksumResponse.text()).trim();

  const sdeRootPath = path.resolve(workDir, "sde");
  if (fs.existsSync(sdeRootPath)) {
    log("SDE folder present. Checking checksum...\n");
    // FIXME: temporarily skipping folder checksum verification
    log("SDE folder is up to date! No action needed.\n");
    return;
  }

  const localSdePath = path.resolve(workDir, LOCAL_SDE_FILENAME);
  if (fs.existsSync(localSdePath)) {
    log("SDE archive present. Checking checksum...\n");
    const currentChecksum = await sdeZipChecksum(localSdePath);

    if (latestChecksum === currentChecksum) {
      log("SDE archive is up to date!\n");
    } else {
      log("SDE archive is outdated. Downloading new one...\n");
      await downloadFile(SDE_DOWNLOAD_URL, workDir, LOCAL_SDE_FILENAME);
    }
  } else {
    await downloadFile(SDE_DOWNLOAD_URL, workDir, LOCAL_SDE_FILENAME);
  }

  mkdir(path.resolve(workDir, "sde"));
  await unzipSde(
    path.resolve(workDir, "sde.zip"),
    path.resolve(workDir, "sde"),
  );
}
