import type { SingleBar } from "cli-progress";
import { downloadFile as coreDownloadFile } from "@jitaspace/sde-utils";

import { globalProgress } from "../lib/progress.js";

export async function downloadFile(
  url: string,
  destinationPath: string,
  filename: string,
): Promise<void> {
  let progress: SingleBar | undefined;

  await coreDownloadFile(
    url,
    destinationPath,
    filename,
    (bytesReceived, total) => {
      if (!progress) {
        progress = globalProgress.create(
          total,
          0,
          { title: "Downloading SDE" },
          { hideCursor: true, emptyOnZero: true },
        );
        globalProgress.update();
      }
      progress.update(bytesReceived);
      if (bytesReceived >= total) {
        progress.stop();
        globalProgress.remove(progress!);
      }
      globalProgress.update();
    },
  );
}
