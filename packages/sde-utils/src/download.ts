import * as fs from "node:fs";
import * as path from "node:path";
import { finished } from "node:stream/promises";
import fetch from "node-fetch";

/**
 * Download a file from a URL to a destination path.
 * @param onProgress Optional callback invoked as bytes arrive: (bytesReceived, totalBytes)
 */
export async function downloadFile(
  url: string,
  destinationPath: string,
  filename: string,
  onProgress?: (bytesReceived: number, totalBytes: number) => void,
): Promise<void> {
  const destination = path.resolve(destinationPath, filename);

  const res = await fetch(url);

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  // @types/node-fetch types `body` as non-nullable, but at runtime node-fetch
  // can yield a null body (e.g. 204 / HEAD responses), so widen to reflect that.
  const body = res.body as NodeJS.ReadableStream | null;
  if (body === null) {
    throw new Error("Response body is empty");
  }

  if (onProgress) {
    const totalBytes = Number.parseInt(
      res.headers.get("content-length") ?? "0",
      10,
    );
    let bytesReceived = 0;
    body.on("data", (chunk: Buffer) => {
      bytesReceived += chunk.length;
      onProgress(bytesReceived, totalBytes);
    });
  }

  const fileStream = fs.createWriteStream(destination);
  await finished(body.pipe(fileStream));
}
