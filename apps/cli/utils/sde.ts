import * as fs from "node:fs";
import * as path from "node:path";
import fetch from "node-fetch";

import {
  LOCAL_SDE_FILENAME,
  SDE_CHECKSUM_URL,
  SDE_DOWNLOAD_URL,
} from "../config/constants.js";
import { getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";
import { downloadFile } from "./download.js";
import { mkdir, sdeFolderChecksum, sdeZipChecksum, unzipSde } from "./fs.js";

export async function latestSdeLastModified() {
  const res = await fetch(SDE_DOWNLOAD_URL, {
    method: "HEAD",
  });
  const lastModifiedHeader = res.headers.get("last-modified");
  if (!lastModifiedHeader)
    throw new Error("Unable to get SDE Last Modified date");
  return new Date(lastModifiedHeader);
}

export async function ensureSdePresentAndExtracted() {
  // download latest checksum
  const checksumResponse = await fetch(SDE_CHECKSUM_URL);
  const latestChecksum = (await checksumResponse.text()).trim();

  // check if SDE extraction folder exists and is valid
  const sdeRootPath = path.resolve(getWorkingDirectory(), "sde");
  console.log("sde root path: ", sdeRootPath);
  if (fs.existsSync(sdeRootPath)) {
    globalProgress.log("SDE folder present. Checking checksum...\n");
    globalProgress.update();

    // calculate folder checksum
    const currentChecksum = await sdeFolderChecksum(
      path.resolve(getWorkingDirectory(), "sde.zip"),
      getWorkingDirectory(),
    );

    if (latestChecksum === currentChecksum) {
      globalProgress.log("SDE folder is up to date! No action needed.\n");
      globalProgress.update();
      return;
    } else {
      globalProgress.log(
        "SDE folder is outdated. Need to rebuild from archive.\n",
      );
    }
  }

  // If we reach this point, it means that the SDE folder is either not present
  // or is outdated. We need to download the SDE ZIP archive and extract it.
  // check if the SDE ZIP archive is present and is valid (checksum)
  const localSdePath = path.resolve(getWorkingDirectory(), LOCAL_SDE_FILENAME);
  if (fs.existsSync(localSdePath)) {
    globalProgress.log("SDE archive present. Checking checksum...\n");

    // calculate current checksum
    const currentChecksum = await sdeZipChecksum(localSdePath);

    if (latestChecksum === currentChecksum) {
      // SDE archive is up-to-date, we can extract it!
      globalProgress.log("SDE archive is up to date!\n");
    } else {
      // SDE archive is outdated, we need to download a new one!
      globalProgress.log("SDE archive is outdated. Downloading new one...\n");
      await downloadFile(
        SDE_DOWNLOAD_URL,
        getWorkingDirectory(),
        LOCAL_SDE_FILENAME,
      );
    }
  } else {
    // SDE archive is not present, we need to download it!
    await downloadFile(
      SDE_DOWNLOAD_URL,
      getWorkingDirectory(),
      LOCAL_SDE_FILENAME,
    );
  }

  // at this point, we are guaranteed to have the up-to-date sde.zip file!
  // we now have to extract it!
  mkdir(path.resolve(getWorkingDirectory(), "sde"));
  await unzipSde(
    path.resolve(getWorkingDirectory(), "sde.zip"),
    path.resolve(getWorkingDirectory(), "sde"),
  );
}
