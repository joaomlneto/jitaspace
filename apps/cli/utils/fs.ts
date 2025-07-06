import crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import StreamZip from "node-stream-zip";

import { globalProgress } from "../lib/progress.js";

// Create directory (recursively) if it doesn't exist
export const mkdir = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
};

// function that, given a path to a file, returns the md5 checksum of the file
export async function sdeZipChecksum(path: string) {
  const zip = new StreamZip.async({ file: path });
  const entries = await zip.entries();
  const checksum = crypto.createHash("md5");

  const progress = globalProgress.create(await zip.entriesCount, 0, {
    title: "Computing SDE Checksum",
  });
  globalProgress.update();

  let entriesProcessed = 0;
  for (const entry of Object.values(entries)) {
    // avoid updating progress bar every iteration, as it will become a bottleneck
    if (entriesProcessed % 100 === 0) {
      globalProgress.update();
    }
    if (entry.isDirectory) {
      continue;
    }
    const content = await zip.entryData(entry.name);
    checksum.update(content);
    progress.increment();
    entriesProcessed++;
  }

  await zip.close();

  progress.stop();

  globalProgress.remove(progress);
  globalProgress.update();

  return checksum.digest("hex");
}

export async function sdeFolderChecksum(
  sdeZipPath: string,
  sdeRootPath: string,
) {
  const zip = new StreamZip.async({ file: sdeZipPath });
  const entries = await zip.entries();
  const checksum = crypto.createHash("md5");

  const progress = globalProgress.create(await zip.entriesCount, 0, {
    title: "Computing SDE Checksum",
  });
  globalProgress.update();

  let entriesProcessed = 0;
  for (const entry of Object.values(entries)) {
    // avoid updating progress bar every iteration, as it will become a bottleneck
    if (entriesProcessed % 100 === 0) {
      globalProgress.update();
    }
    if (entry.isDirectory) {
      continue;
    }
    const content = fs.readFileSync(path.resolve(sdeRootPath, entry.name));
    checksum.update(content);
    progress.increment();
    entriesProcessed++;
  }

  progress.stop();

  globalProgress.remove(progress);
  globalProgress.update();

  return checksum.digest("hex");
}

export async function unzipSde(zipFilePath: string, targetPath: string) {
  const zip = new StreamZip.async({ file: zipFilePath });
  const entries = await zip.entries();

  // create progress bar
  const progress = globalProgress.create(await zip.entriesCount, 0, {
    title: "Extracting SDE",
  });
  globalProgress.update();

  for (const entry of Object.values(entries)) {
    const entryDestinationPath = path.resolve(targetPath, entry.name);
    if (entry.isDirectory) {
      mkdir(entryDestinationPath);
      continue;
    }
    // create required directory
    mkdir(path.dirname(entryDestinationPath));

    // extract file
    await zip.extract(entry.name, entryDestinationPath);
    progress.increment();

    // update progress bar
    globalProgress.update();
  }

  await zip.close();

  // remove progress bar
  progress.stop();
  globalProgress.remove(progress);
  globalProgress.update();
}
