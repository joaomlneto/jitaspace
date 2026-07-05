import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import tar from "tar-stream";
import bz2 from "unbzip2-stream";

/**
 * Downloads a .tar.bz2 file from a given URL, extracts its contents,
 * and returns the list of files in the archive as an array of objects
 * with file names and their content (optionally parsed to JSON).
 */
export const downloadTarBz2FileAndParseJson = async (url: string) => {
  // Fetch the data
  const response = await fetch(url, {
    headers: {
      "User-Agent": "jitaspace/eve-scrape",
    },
  });

  if (!response.ok) {
    console.log(`No data available for ${url}`);
    throw new Error(
      `Failed to fetch data from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  if (response.body === null) {
    console.log(`No body in response for ${url}`);
    throw new Error(
      `Response body is null for ${url}. This might be due to an unsupported response type
      or an issue with the fetch request.`,
    );
  }

  console.log(`Processing wars package for ${url}`);

  // Convert the Web ReadableStream to a Node.js ReadableStream. `response.body`
  // is the DOM `ReadableStream` from the global `fetch`; at runtime it is the
  // same object `Readable.fromWeb` expects (`node:stream/web`'s ReadableStream),
  // so we retype it across the two structurally-identical declarations.
  const nodeStream = Readable.fromWeb(
    response.body as NodeWebReadableStream<Uint8Array>,
  );
  console.log(`Converted Web ReadableStream to Node.js ReadableStream`);

  const files: { name: string; content: object }[] = [];
  const extract = tar.extract();

  // Capture the bz2 transform so we can attach an "error" listener to it.
  // `pipe()` does not forward errors downstream, so an "error" on the fetch
  // body, the decompressor, or the extractor would otherwise go unhandled and
  // the awaited Promise would never settle (the job hangs until it is killed).
  const decompress = bz2();
  nodeStream.pipe(decompress).pipe(extract);

  // Decompress bz2 stream and parse contents
  await new Promise<void>((resolve, reject) => {
    // Reject on any failure along the pipeline so the Promise settles
    // deterministically instead of hanging on a truncated or corrupt download.
    nodeStream.on("error", reject);
    decompress.on("error", reject);
    extract.on("error", reject);

    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        let content: object;
        try {
          content = JSON.parse(
            Buffer.concat(chunks).toString("utf8"),
          ) as object;
        } catch (err) {
          // A non-JSON entry would otherwise throw uncaught inside this event
          // callback; route it to the Promise so the caller sees a rejection.
          next(
            new Error(
              `Failed to parse JSON from archive entry "${header.name}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            ),
          );
          return;
        }
        files.push({
          name: header.name,
          content,
        });
        next();
      });
      stream.on("error", reject);
    });

    extract.on("finish", () => {
      console.log(`Extracted ${files.length} files:`);
      resolve();
    });
  });

  //console.log("First file content:", files[0]?.name, files[0]?.content);
  console.log(`Finished processing wars package for ${url}`);

  return files;
};
