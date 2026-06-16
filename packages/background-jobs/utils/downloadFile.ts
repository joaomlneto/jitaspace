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
  nodeStream.pipe(bz2()).pipe(extract);

  // Decompress bz2 stream and parse contents
  await new Promise<void>((resolve, reject) => {
    //const csvStream = decompressedStream.pipe(csvParser());

    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const content = JSON.parse(
          Buffer.concat(chunks).toString("utf8"),
        ) as object;
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
