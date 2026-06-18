import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { downloadFile, SDE_DOWNLOAD_URL, unzipSde } from "@jitaspace/sde-utils";

import { defineJob } from "../../../core";

export interface DownloadAndExtractSdeEventPayload {
  data: {
    /** Override the archive URL. Defaults to the official EVE Online SDE ZIP. */
    url?: string;
  };
}

const SDE_ARCHIVE_FILENAME = "sde.zip";

/**
 * Download the EVE Online Static Data Export (SDE) archive and extract it.
 *
 * A standalone download/extract probe: it downloads + extracts into a temporary
 * directory, reports what it found, and cleans up. It does not hand the files to
 * downstream processing — each `ingest-sde-*` job downloads + parses the archive
 * itself, so this exists to validate (and time) the download/extract path.
 *
 * The whole download/extract runs inside a single `ctx.run` step on purpose:
 * the work writes to an ephemeral temp directory, and on the Inngest adapter any
 * code outside a step re-runs on each step boundary, which would otherwise leave
 * the extract step looking in a different temp dir than the download wrote to.
 */
export const downloadAndExtractSde = defineJob<
  DownloadAndExtractSdeEventPayload["data"]
>({
  id: "download-and-extract-sde",
  name: "Download & Extract SDE",
  description:
    "Download the EVE Online Static Data Export archive and extract it to a temporary directory.",
  trigger: { type: "event" },
  // One run at a time, and give the large download + many-file extraction room
  // to finish (the adapter default maxDuration is 600s).
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async (ctx) => {
    const startTime = performance.now();
    const sourceUrl = ctx.payload.url ?? SDE_DOWNLOAD_URL;

    const stats = await ctx.run("Download and extract SDE", async () => {
      const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jitaspace-sde-"));
      const archivePath = path.join(workDir, SDE_ARCHIVE_FILENAME);
      const extractDir = path.join(workDir, "sde");

      try {
        ctx.logger.info("Downloading SDE archive", { sourceUrl });
        await downloadFile(sourceUrl, workDir, SDE_ARCHIVE_FILENAME);
        const zipBytes = fs.statSync(archivePath).size;
        ctx.logger.info("Downloaded SDE archive", { zipBytes });

        let extractedFiles = 0;
        await unzipSde(archivePath, extractDir, (current) => {
          extractedFiles = current;
        });
        ctx.logger.info("Extracted SDE archive", {
          extractDir,
          extractedFiles,
        });

        // The extracted files are not handed downstream here — each
        // `ingest-sde-*` job downloads + parses the archive independently. Runs
        // execute in an ephemeral container, so the files do not outlive this
        // handler (the working directory is removed in the `finally` below).

        return { zipBytes, extractedFiles };
      } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    });

    return {
      sourceUrl,
      stats,
      elapsed: performance.now() - startTime,
    };
  },
});
