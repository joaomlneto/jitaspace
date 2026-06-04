import * as fs from "node:fs";
import * as path from "node:path";
import fetch from "node-fetch";
import {
  latestSdeLastModified,
  LOCAL_SDE_FILENAME,
  SDE_CHECKSUM_URL,
  SDE_DOWNLOAD_URL,
} from "@jitaspace/sde-utils";

import { getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";
import { downloadFile } from "./download.js";
import { mkdir, sdeZipChecksum, unzipSde } from "./fs.js";

export { latestSdeLastModified };

export async function ensureSdePresentAndExtracted() {
  const checksumResponse = await fetch(SDE_CHECKSUM_URL);
  const latestChecksum = (await checksumResponse.text()).trim();

  const sdeRootPath = path.resolve(getWorkingDirectory(), "sde");
  console.log("sde root path: ", sdeRootPath);
  if (fs.existsSync(sdeRootPath)) {
    globalProgress.log("SDE folder present. Checking checksum...\n");
    globalProgress.update();

    // FIXME: temporarily skipping folder checksum verification
    globalProgress.log("SDE folder is up to date! No action needed.\n");
    return;
  }

  const localSdePath = path.resolve(getWorkingDirectory(), LOCAL_SDE_FILENAME);
  if (fs.existsSync(localSdePath)) {
    globalProgress.log("SDE archive present. Checking checksum...\n");

    const currentChecksum = await sdeZipChecksum(localSdePath);

    if (latestChecksum === currentChecksum) {
      globalProgress.log("SDE archive is up to date!\n");
    } else {
      globalProgress.log("SDE archive is outdated. Downloading new one...\n");
      await downloadFile(
        SDE_DOWNLOAD_URL,
        getWorkingDirectory(),
        LOCAL_SDE_FILENAME,
      );
    }
  } else {
    await downloadFile(
      SDE_DOWNLOAD_URL,
      getWorkingDirectory(),
      LOCAL_SDE_FILENAME,
    );
  }

  mkdir(path.resolve(getWorkingDirectory(), "sde"));
  await unzipSde(
    path.resolve(getWorkingDirectory(), "sde.zip"),
    path.resolve(getWorkingDirectory(), "sde"),
  );
}
