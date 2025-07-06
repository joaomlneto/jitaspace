import * as fs from "node:fs";
import * as path from "node:path";
import { finished } from "node:stream/promises";
import fetch, { type Response } from "node-fetch";

import { globalProgress } from "../lib/progress.js";

function showDownloadProgress(response: Response) {
  const total = parseInt(response.headers.get("content-length") || "0");

  if (!response.body) {
    throw new Error("Response body is empty");
  }
  if (total === 0) {
    throw new Error("Content length is 0");
  }

  const progress = globalProgress.create(
    total,
    0,
    { title: "Downloading SDE" },
    {
      hideCursor: true,
      emptyOnZero: true,
    },
  );

  let isFinished = false;

  response.body.on("data", (chunk: Buffer) => {
    if (isFinished) {
      return;
    }
    progress.increment(chunk.length);
  });

  response.body.on("finish", () => {
    isFinished = true;
    progress.update(total);
    globalProgress.update();
    progress.stop();
    globalProgress.update();
    globalProgress.remove(progress);
    globalProgress.update();
  });
}

/**
 * Download a file from a URL to a destination path
 * @param url URL to download from
 * @param destinationPath Destination path
 * @param filename Filename to save as (including extension) at destination path
 */
export async function downloadFile(
  url: string,
  destinationPath: string,
  filename: string,
) {
  const destination = path.resolve(destinationPath, filename);

  const res = await fetch(url);

  showDownloadProgress(res);

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath);
  }

  if (res.body === null) {
    throw new Error("Response body is empty");
  }

  const fileStream = fs.createWriteStream(destination);
  await finished(res.body.pipe(fileStream));
}
