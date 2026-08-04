import * as fs from "node:fs";
import * as path from "node:path";

import type { SdeBuild } from "./build";
import { latestSdeBuild, sdeFolderBuild, sdeZipBuild } from "./build";
import { SDE_DOWNLOAD_URL } from "./constants";
import { downloadFile } from "./download";
import { mkdir, unzipSde } from "./zip";

const SDE_ARCHIVE_FILENAME = "sde.zip";
const SDE_FOLDER_NAME = "sde";

export interface EnsureSdeOptions {
  /** Status messages. Defaults to `console.log`. */
  onLog?: (message: string) => void;
  /** Download progress: (bytesReceived, totalBytes). */
  onDownloadProgress?: (bytesReceived: number, totalBytes: number) => void;
  /** Extraction progress: (entriesExtracted, totalEntries). */
  onExtractProgress?: (current: number, total: number) => void;
}

const describeBuild = (build: SdeBuild | null) =>
  build === null ? "of an unknown build" : `on build ${build.buildNumber}`;

/**
 * Ensure the SDE is downloaded and extracted in `workDir`.
 *
 * Freshness is decided by CCP's SDE build number: the published build is
 * fetched with one small request, and both a downloaded `sde.zip` and an
 * extracted `sde/` folder state the build they came from in `_sde.yaml`. A copy
 * on the published build is reused; anything else — an older build, or metadata
 * we cannot read — is re-downloaded and re-extracted.
 *
 * @param workDir Directory to store `sde.zip` and the extracted `sde/` folder.
 */
export async function ensureSdePresentAndExtracted(
  workDir: string,
  options: EnsureSdeOptions = {},
): Promise<void> {
  const { onLog, onDownloadProgress, onExtractProgress } = options;
  const log = onLog ?? console.log;

  const { buildNumber } = await latestSdeBuild();

  const sdeRootPath = path.resolve(workDir, SDE_FOLDER_NAME);
  const folderBuild = sdeFolderBuild(sdeRootPath);
  if (folderBuild?.buildNumber === buildNumber) {
    log(`SDE folder is up to date (build ${buildNumber})!\n`);
    return;
  }
  if (fs.existsSync(sdeRootPath)) {
    log(
      `SDE folder is ${describeBuild(folderBuild)}. Replacing with build ${buildNumber}...\n`,
    );
    // Wipe rather than extract over the top: files dropped between builds would
    // otherwise survive and be read back as though they were still current.
    fs.rmSync(sdeRootPath, { recursive: true, force: true });
  }

  const localSdePath = path.resolve(workDir, SDE_ARCHIVE_FILENAME);
  const archiveBuild = await sdeZipBuild(localSdePath);
  if (archiveBuild?.buildNumber === buildNumber) {
    log(`SDE archive is up to date (build ${buildNumber})!\n`);
  } else {
    log(
      fs.existsSync(localSdePath)
        ? `SDE archive is ${describeBuild(archiveBuild)}. Downloading build ${buildNumber}...\n`
        : `Downloading SDE build ${buildNumber}...\n`,
    );
    await downloadFile(
      SDE_DOWNLOAD_URL,
      workDir,
      SDE_ARCHIVE_FILENAME,
      onDownloadProgress,
    );
  }

  mkdir(sdeRootPath);
  await unzipSde(localSdePath, sdeRootPath, onExtractProgress);
}
