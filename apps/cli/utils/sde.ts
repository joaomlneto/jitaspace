import type { SingleBar } from "cli-progress";

import { ensureSdePresentAndExtracted as coreEnsureSdePresentAndExtracted } from "@jitaspace/sde-utils";

import { getWorkingDirectory } from "../lib/cli.js";
import { globalProgress } from "../lib/progress.js";

/**
 * Download + extract the SDE into the CLI working directory, wiring the shared
 * implementation's progress hooks up to the CLI's progress bars.
 */
export async function ensureSdePresentAndExtracted() {
  let download: SingleBar | undefined;
  let extract: SingleBar | undefined;

  const finish = (progress: SingleBar | undefined) => {
    if (!progress) return;
    progress.stop();
    globalProgress.remove(progress);
    globalProgress.update();
  };

  try {
    await coreEnsureSdePresentAndExtracted(getWorkingDirectory(), {
      onLog: (message) => {
        globalProgress.log(message);
        globalProgress.update();
      },
      onDownloadProgress: (bytesReceived, total) => {
        download ??= globalProgress.create(
          total,
          0,
          { title: "Downloading SDE" },
          { hideCursor: true, emptyOnZero: true },
        );
        download.update(bytesReceived);
        globalProgress.update();
      },
      onExtractProgress: (current, total) => {
        // The download bar has served its purpose once extraction starts.
        finish(download);
        download = undefined;
        extract ??= globalProgress.create(total, 0, {
          title: "Extracting SDE",
        });
        extract.update(current);
        globalProgress.update();
      },
    });
  } finally {
    finish(download);
    finish(extract);
  }
}
