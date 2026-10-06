/**
 * PostCSS plugin that drops declarations whose value is an empty `url("")`, in
 * `@eve-online-tools/eve-ship-tree`'s stylesheet only.
 *
 * Why: the library's published `styles.css` contains four of them
 * (`--ship-tree-groups-icon-small-npc: url("")`, one per rule that sets it),
 * left by a texture its build could not resolve. Up to 0.2.0 it also had
 * sixteen `--ship-tree-elements-icons: url("")` for element icons. They render as nothing, but Turbopack
 * tries to resolve every `url()` and fails the whole build on the empty one
 * (`Module not found: Can't resolve ''`). Removing them changes nothing that
 * was visible and lets the stylesheet be imported.
 *
 * The scope is deliberate: any other stylesheet with an empty `url()` is a bug
 * we would want to hear about, not paper over. If a later release of the library
 * stops emitting them this plugin finds nothing to do.
 *
 * Registered in `apps/web/postcss.config.cjs`.
 */

const LIBRARY = /[\\/]@eve-online-tools[\\/]eve-ship-tree[\\/]/;
const EMPTY_URL = /url\(\s*(?:""|'')\s*\)/;

/** @returns {import("postcss").Plugin} */
function dropEmptyUrls() {
  return {
    postcssPlugin: "jitaspace-ship-tree-drop-empty-urls",
    Declaration(declaration) {
      const file = declaration.source?.input.file;
      if (!file || !LIBRARY.test(file)) return;
      if (!EMPTY_URL.test(declaration.value)) return;

      const rule = declaration.parent;
      declaration.remove();
      // Don't leave `[data-element="8"]{}` behind.
      if (rule?.nodes.length === 0) rule.remove();
    },
  };
}
dropEmptyUrls.postcss = true;

module.exports = dropEmptyUrls;
