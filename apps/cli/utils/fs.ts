import type { SingleBar } from "cli-progress";
import {
  mkdir,
  sdeFolderChecksum as coreSdeFolderChecksum,
  sdeZipChecksum as coreSdeZipChecksum,
  unzipSde as coreUnzipSde,
} from "@jitaspace/sde-utils";

import { globalProgress } from "../lib/progress.js";

export { mkdir };

export async function sdeZipChecksum(filePath: string): Promise<string> {
  let progress: SingleBar | undefined;

  const result = await coreSdeZipChecksum(filePath, (current, total) => {
    if (!progress) {
      progress = globalProgress.create(total, 0, {
        title: "Computing SDE Checksum",
      });
      globalProgress.update();
    }
    if (current % 100 === 0) {
      progress.update(current);
      globalProgress.update();
    }
  });

  progress?.stop();
  if (progress) globalProgress.remove(progress);
  globalProgress.update();

  return result;
}

export async function sdeFolderChecksum(
  sdeZipPath: string,
  sdeRootPath: string,
): Promise<string> {
  let progress: SingleBar | undefined;

  const result = await coreSdeFolderChecksum(
    sdeZipPath,
    sdeRootPath,
    (current, total) => {
      if (!progress) {
        progress = globalProgress.create(total, 0, {
          title: "Computing SDE Checksum",
        });
        globalProgress.update();
      }
      if (current % 100 === 0) {
        progress.update(current);
        globalProgress.update();
      }
    },
  );

  progress?.stop();
  if (progress) globalProgress.remove(progress);
  globalProgress.update();

  return result;
}

export async function unzipSde(
  zipFilePath: string,
  targetPath: string,
): Promise<void> {
  let progress: SingleBar | undefined;

  await coreUnzipSde(zipFilePath, targetPath, (current, total) => {
    if (!progress) {
      progress = globalProgress.create(total, 0, { title: "Extracting SDE" });
      globalProgress.update();
    }
    progress.update(current);
    globalProgress.update();
  });

  progress?.stop();
  if (progress) globalProgress.remove(progress);
  globalProgress.update();
}
