/**
 * @jest-environment node
 */
import { readFile } from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import postcss from "postcss";

import dropEmptyUrls from "../postcss.cjs";

const LIBRARY_CSS =
  "/repo/node_modules/@eve-online-tools/eve-ship-tree/dist/styles.css";

const run = (css: string, from: string) =>
  postcss([dropEmptyUrls()])
    .process(css, { from })
    .then((result) => result.css);

describe("dropEmptyUrls", () => {
  it("drops an empty url() from the library's stylesheet, along with its now-empty rule", async () => {
    const out = await run(
      '[data-element="8"]{--icons:url("")}[data-element="9"]{--icons:url("./a.png")}',
      LIBRARY_CSS,
    );

    expect(out).not.toContain('data-element="8"');
    expect(out).toContain('[data-element="9"]{--icons:url("./a.png")}');
  });

  it.each([['url("")'], ["url('')"], ['url( "" )'], ["url(  '' )"]])(
    "recognises %s",
    async (value) => {
      const out = await run(`.a{--x:${value}}`, LIBRARY_CSS);
      expect(out.trim()).toBe("");
    },
  );

  it("keeps the rest of a rule when only one declaration is empty", async () => {
    const out = await run('.a{color:red;--x:url("");margin:0}', LIBRARY_CSS);

    expect(out).toBe(".a{color:red;margin:0}");
  });

  it("leaves a real url() alone", async () => {
    const css =
      '.a{background:url("./real.png")}.b{background:url(data:image/png;base64,AAAA)}';
    expect(await run(css, LIBRARY_CSS)).toBe(css);
  });

  it("is scoped to the library: any other stylesheet is left as it was", async () => {
    const css = '.a{--x:url("")}';
    expect(await run(css, "/repo/apps/web/app/globals.css")).toBe(css);
    expect(await run(css, "/repo/node_modules/@mantine/core/styles.css")).toBe(
      css,
    );
  });

  it("does nothing when the stylesheet has no file path", async () => {
    const css = '.a{--x:url("")}';
    expect(
      await postcss([dropEmptyUrls()]).process(css, { from: undefined }),
    ).toHaveProperty("css", css);
  });

  // The defect this exists for, against the library as installed. If a later
  // release stops shipping empty urls this still passes (there is nothing left
  // to drop), and the plugin can be deleted.
  it("removes every empty url() from the real installed stylesheet and nothing else", async () => {
    const manifest = findPackageJSON(
      "@eve-online-tools/eve-ship-tree",
      join(process.cwd(), "noop.js"),
    );
    const file = join(dirname(manifest ?? ""), "dist", "styles.css");
    const css = await readFile(file, "utf8");
    const empty = /url\(\s*(?:""|'')\s*\)/g;
    const urls = (source: string) => source.match(/url\(/g)?.length ?? 0;
    const emptyBefore = css.match(empty)?.length ?? 0;

    const out = await run(css, file);

    expect(out.match(empty)).toBeNull();
    expect(urls(out)).toBe(urls(css) - emptyBefore);
  });
});
