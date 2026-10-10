/**
 * Mantine renders a modal's `title` inside its own <h2>, so a title must be
 * phrasing content. A <Title> there is an <h3> inside that <h2> (React logs
 * "<h2> cannot contain a nested <h3>"), and a plain <Text> is a <p>, which a
 * heading cannot contain either. Pass a string, or <Text component="span">.
 */

import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "@jest/globals";

const root = join(__dirname, "..");

function findTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findTsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

// `title: <Title …>`, `title: <h3>`, or `title: <Text …>` without a span,
// optionally wrapped in parentheses across lines as Prettier formats it.
const INVALID_TITLE =
  /\btitle:\s*\(?\s*<(?:Title\b|h[1-6]\b|Text\b(?![^>]*component="span"))/g;

describe("modal titles", () => {
  const offenders = ["app", "components", "layouts"]
    .flatMap((dir) => findTsxFiles(join(root, dir)))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [...source.matchAll(INVALID_TITLE)].map(
        (match) =>
          `${relative(root, file)}:${source.slice(0, match.index).split("\n").length}`,
      );
    });

  it("never nest a heading or paragraph inside the modal's <h2>", () => {
    expect(offenders).toEqual([]);
  });
});
