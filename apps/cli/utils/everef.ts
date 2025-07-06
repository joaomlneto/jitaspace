import async from "async";
import { parse } from "node-html-parser";

type File = {
  name: string;
  size: number;
  lastModified: Date;
  url: string;
};
type Directory = {
  name: string;
  url: string;
  children: DirectoryContents;
};

type DirectoryContents = {
  files: File[];
  directories: Directory[];
};

export async function getEveRefDataDirectoryContents(
  url: string,
): Promise<DirectoryContents> {
  console.log("> ", url);
  // normalize URL to end with a slash
  if (!url.endsWith("/")) {
    url += "/";
  }

  // fetch the index page
  const response = await fetch(url);

  // parse the index page to fetch the HTML <pre> element
  const text = await response.text();
  const root = parse(text);
  const pre = root.querySelector("pre")!.text;
  const inner = parse(pre);

  // parse the entries from the <pre> element
  const files = inner.querySelectorAll(".data-file").map((entry) => {
    const name = entry.querySelector(".data-file-url")!.text;
    const size = parseInt(
      entry.querySelector(".data-file-size-bytes")!.text.replaceAll(",", ""),
    );
    const lastModified = new Date(
      entry.querySelector(".data-file-last-modified")!.text,
    );
    return { name, size, lastModified, url: url + name };
  });

  let directories = inner.querySelectorAll(".data-dir").map((entry) => {
    const name = entry.querySelector(".url")!.text;
    return {
      name,
      url: url + name,
      children: [] as unknown as DirectoryContents,
    };
  });
  const directoriesWithContents = await async.mapLimit(
    directories,
    10,
    async function (directory: DirectoryContents["directories"][0]) {
      return {
        ...directory,
        children: await getEveRefDataDirectoryContents(directory.url),
      };
    },
  );

  return { files, directories: directoriesWithContents };
}
