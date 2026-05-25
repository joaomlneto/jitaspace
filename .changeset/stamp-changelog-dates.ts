/**
 * Post-processes a CHANGELOG.md file produced by `changeset version`:
 *
 * - Adds today's date to the latest (undated) version heading
 * - Strips the "### Major/Minor/Patch Changes" subheadings added by changesets
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

  for (const line of currentLines) {
    stoppedIndex++;

    if (line.startsWith("## ")) {
      if (!latestVersion) {
        // Skip if the heading already has a date (e.g. re-running the script)
        const rawVersion = line.replace("## ", "");
        const alreadyDated = /\d{4}-\d{2}-\d{2}$/.test(rawVersion);
        latestVersion = rawVersion;
        newLines.push(
          alreadyDated ? line : `## ${latestVersion} — ${today}`,
        );
        continue;
      } else {
        entries.sort(byPrefixOrder);
        newLines.push("", ...entries, "");
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
      continue;
    }

    // Sub-bullets produced by changesets ("  - @pkg@version") — skip them
    // when inside the latest version block; they're dependency noise.
    if (line.startsWith("  ") && latestVersion) {
      continue;
    }

    if (line === "" && latestVersion) {
      continue;
    }

    newLines.push(line);
  }

  // Flush any remaining entries if the file has only one version block
  if (entries.length > 0) {
    entries.sort(byPrefixOrder);
    newLines.push("", ...entries, "");
  }

  writeFileSync(path, newLines.join("\n"), "utf8");
  console.log(`"${path}" rewritten.`);
}
