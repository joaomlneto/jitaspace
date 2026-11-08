import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "@jest/globals";

// React DevTools and Storybook's code snippets name a memo component by its
// displayName, so it has to match the export. Several had drifted (e.g.
// HumanDurationText called itself "TimeAgoText"); this reads every source file
// rather than importing the barrel, which would drag in next/image and GIFs.
const root = join(__dirname, "..");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "tests", "coverage"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });

const assignments = sourceFiles(root).flatMap((file) =>
  [
    ...readFileSync(file, "utf8").matchAll(
      /^(\w+)\.displayName\s*=\s*"([^"]*)";/gm,
    ),
  ].map((match) => ({
    file: relative(root, file),
    component: match[1],
    displayName: match[2],
  })),
);

describe("displayName", () => {
  it("finds the components' displayName assignments", () => {
    expect(assignments.length).toBeGreaterThan(80);
  });

  it.each(assignments)(
    "$component in $file is named after its export",
    ({ component, displayName }) => {
      expect(displayName).toBe(component);
    },
  );
});
