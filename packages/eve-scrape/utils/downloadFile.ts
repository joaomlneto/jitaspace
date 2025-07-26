import { Readable } from "node:stream";
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

  // Convert the Web ReadableStream to a Node.js ReadableStream
  // @ts-expect-error
  const nodeStream = Readable.fromWeb(response.body);
  console.log(`Converted Web ReadableStream to Node.js ReadableStream`);

  const files: { name: string; content: object }[] = [];
  const extract = tar.extract();
  const decompressedStream = nodeStream.pipe(bz2()).pipe(extract);

  // Decompress bz2 stream and parse contents
  await new Promise<void>((resolve, reject) => {
    //const csvStream = decompressedStream.pipe(csvParser());

    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        files.push({
          name: header.name,
          content: JSON.parse(Buffer.concat(chunks).toString("utf8")),
        });
        next();
      });
      stream.on("error", reject);
    });

    extract.on("finish", () => {
      console.log(
        "Extracted files:",
        files.map((f) => f.name),
      );
      resolve();
    });
  });

  // print the contents of the first file
  console.log("First file content:", files[0]?.name, files[0]?.content);

  console.log(`Finished processing wars package for ${url}`);

  return files;
};
