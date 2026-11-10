/**
 * Post-processes a CHANGELOG.md file produced by `changeset version`:
 *
 * - Adds today's date to the latest (undated) version heading
 * - Strips the "### Major/Minor/Patch Changes" subheadings added by changesets
 * - Drops the "  - @pkg@version" lists under "Updated dependencies" entries,
 *   while keeping the continuation lines of multi-line entries
 * - Sorts entries within the release by conventional prefix order
 *
 * Inspired by stylelint's changelog post-processing script.
 *
 * Usage:
 *   tsx .changeset/stamp-changelog-dates.ts <path/to/CHANGELOG.md> [...]
 */

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const ENTRY_PREFIXES = ["Removed", "Changed", "Deprecated", "Added", "Fixed"];
const entryPattern = new RegExp(`^- (${ENTRY_PREFIXES.join("|")}):`);

const byPrefixOrder = (a: string, b: string): number => {
  const aPrefix = entryPattern.exec(a)?.[1];
  const bPrefix = entryPattern.exec(b)?.[1];

  if (aPrefix && bPrefix) {
    const comparison =
      ENTRY_PREFIXES.indexOf(aPrefix) - ENTRY_PREFIXES.indexOf(bPrefix);
    if (comparison !== 0) return comparison;
    return a.localeCompare(b);
  }

  if (!aPrefix && bPrefix) return 1;
  if (aPrefix && !bPrefix) return -1;
  return 0;
};

/**
 * Sorts a release's entries and lays them out as a Markdown list. When any
 * entry has more than one paragraph the list is "loose", and Markdown (and
 * Prettier) expect a blank line between every item, not just inside that one.
 */
const listLines = (entries: string[]): string[] => {
  entries.sort(byPrefixOrder);
  const loose = entries.some((entry) => entry.includes("\n\n"));
  return loose
    ? entries.flatMap((entry, i) => (i ? ["", entry] : [entry]))
    : entries;
};

const today = new Date().toISOString().split("T")[0];

const paths = process.argv.slice(2);

if (paths.length === 0) {
  throw new Error(
    "Please provide one or more paths to CHANGELOG.md files.\n" +
      "Usage: tsx .changeset/stamp-changelog-dates.ts <path> [...]",
  );
}

for (const path of paths) {
  const content = readFileSync(path, "utf8");
  const currentLines = content.split("\n");
  const newLines: string[] = [];
  const entries: string[] = [];
  let latestVersion: string | undefined;
  let stoppedIndex = -1;
  let subHeader = false;
  let blankPending = false;

  for (const line of currentLines) {
    stoppedIndex++;

    if (line.startsWith("## ")) {
      if (!latestVersion) {
        // Skip if the heading already has a date (e.g. re-running the script)
        const rawVersion = line.replace("## ", "");
        const alreadyDated = /\d{4}-\d{2}-\d{2}$/.test(rawVersion);
        latestVersion = rawVersion;
        newLines.push(alreadyDated ? line : `## ${latestVersion} — ${today}`);
        continue;
      } else {
        newLines.push("", ...listLines(entries), "");
        newLines.push(...currentLines.slice(stoppedIndex));
        entries.length = 0;
        break;
      }
    }

    if (/^### (?:Major|Minor|Patch) Changes/i.test(line)) {
      subHeader = true;
      continue;
    } else if (subHeader) {
      subHeader = false;
      continue;
    }

    if (line.startsWith("- ")) {
      entries.push(line);
      blankPending = false;
      continue;
    }

    // Blank lines inside the latest version block are dropped, except a
    // paragraph break inside a multi-line entry, which is only known once the
    // next indented line arrives. Dropping that one would merge the paragraph
    // after a nested list into the list's last item.
    if (line.trim() === "" && latestVersion) {
      blankPending = entries.length > 0;
      continue;
    }

    // Indented lines inside the latest version block belong to the entry
    // above them. Under "- Updated dependencies" they are the "  - @pkg@1.2.3"
    // list, which is dependency noise, so drop them. Anywhere else they are
    // the rest of a multi-line changeset summary (changesets indents every
    // line after the first), so keep them on their entry, which also keeps
    // them together when the entries are sorted.
    if (line.startsWith("  ") && latestVersion) {
      const last = entries.length - 1;
      const entry = entries[last];
      if (entry !== undefined && !entry.startsWith("- Updated dependencies")) {
        entries[last] =
          `${entry}\n${blankPending ? "\n" : ""}${line.trimEnd()}`;
      }
      blankPending = false;
      continue;
    }

    newLines.push(line);
  }

  // Flush any remaining entries if the file has only one version block
  if (entries.length > 0) {
    newLines.push("", ...listLines(entries), "");
  }

  writeFileSync(path, newLines.join("\n"), "utf8");
  console.log(`"${path}" rewritten.`);
}
